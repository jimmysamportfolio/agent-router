import type { PoolClient } from "pg";
import { TRPCError } from "@trpc/server";
import { BaseRepository } from "@/lib/db/base.repository";
import { executeInTransaction } from "@/lib/db/client";
import { DatabaseError } from "@/lib/errors";
import type { ReviewJobData } from "@/server/queue";
import { DEFAULT_TENANT_ID } from "@/config/constants";
import type {
  ListingRow,
  ReviewRow,
  ReviewStatus,
  ReviewStatusOutput,
  Verdict,
  ViolationRow,
} from "@/types";

// ── Review Repository ───────────────────────────────────────────────

export interface IReviewRepository {
  insert(listingId: string, client?: PoolClient): Promise<ReviewRow>;
  getById(reviewId: string): Promise<ReviewRow | undefined>;
  updateStatus(
    reviewId: string,
    status: ReviewStatus,
    trace?: Record<string, unknown>,
    client?: PoolClient,
  ): Promise<ReviewRow>;
  updateVerdict(
    reviewId: string,
    verdict: Verdict,
    confidence: number,
    explanation: string,
    trace: Record<string, unknown>,
    client?: PoolClient,
  ): Promise<ReviewRow>;
}

const REVIEW_INSERT_SQL = `INSERT INTO reviews (listing_id) VALUES ($1) RETURNING *`;
const REVIEW_GET_BY_ID_SQL = `SELECT * FROM reviews WHERE id = $1`;
const REVIEW_UPDATE_STATUS_SQL = `UPDATE reviews SET status = $1, trace = COALESCE($2, trace), updated_at = NOW() WHERE id = $3 RETURNING *`;
const REVIEW_UPDATE_VERDICT_SQL = `UPDATE reviews SET verdict = $1, confidence = $2, explanation = $3, trace = $4, status = $5, updated_at = NOW() WHERE id = $6 RETURNING *`;
const COMPLETE_STATUS: ReviewStatus = "complete";

export class ReviewRepository
  extends BaseRepository
  implements IReviewRepository
{
  async insert(listingId: string, client?: PoolClient): Promise<ReviewRow> {
    const row = await this.queryOne<ReviewRow>(
      REVIEW_INSERT_SQL,
      [listingId],
      client,
    );
    if (!row) throw new DatabaseError("Failed to insert review");
    return row;
  }

  async getById(reviewId: string): Promise<ReviewRow | undefined> {
    return this.queryOne<ReviewRow>(REVIEW_GET_BY_ID_SQL, [reviewId]);
  }

  async updateStatus(
    reviewId: string,
    status: ReviewStatus,
    trace?: Record<string, unknown>,
    client?: PoolClient,
  ): Promise<ReviewRow> {
    const params = [status, trace ?? null, reviewId];
    const row = await this.queryOne<ReviewRow>(
      REVIEW_UPDATE_STATUS_SQL,
      params,
      client,
    );
    if (!row) throw new DatabaseError("Failed to update review status");
    return row;
  }

  async updateVerdict(
    reviewId: string,
    verdict: Verdict,
    confidence: number,
    explanation: string,
    trace: Record<string, unknown>,
    client?: PoolClient,
  ): Promise<ReviewRow> {
    const params = [
      verdict,
      confidence,
      explanation,
      trace,
      COMPLETE_STATUS,
      reviewId,
    ];
    const row = await this.queryOne<ReviewRow>(
      REVIEW_UPDATE_VERDICT_SQL,
      params,
      client,
    );
    if (!row) throw new DatabaseError("Failed to update review verdict");
    return row;
  }
}

// ── Listing Repository ──────────────────────────────────────────────

export interface InsertListingInput {
  tenantId: string;
  title: string;
  description: string;
  category: string;
  imageUrls: string[];
  metadata: Record<string, unknown>;
}

export interface IListingRepository {
  insert(input: InsertListingInput, client?: PoolClient): Promise<ListingRow>;
  getById(listingId: string): Promise<ListingRow | undefined>;
}

const LISTING_COLUMNS =
  "id, tenant_id, title, description, category, image_urls, metadata, created_at";

const LISTING_INSERT_SQL = `
  INSERT INTO listings (tenant_id, title, description, category, image_urls, metadata)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING ${LISTING_COLUMNS}`;

const LISTING_GET_BY_ID_SQL = `SELECT ${LISTING_COLUMNS} FROM listings WHERE id = $1`;

export class ListingRepository
  extends BaseRepository
  implements IListingRepository
{
  async insert(
    input: InsertListingInput,
    client?: PoolClient,
  ): Promise<ListingRow> {
    const params = [
      input.tenantId,
      input.title,
      input.description,
      input.category,
      input.imageUrls,
      input.metadata,
    ];

    const row = await this.queryOne<ListingRow>(
      LISTING_INSERT_SQL,
      params,
      client,
    );
    if (!row) throw new DatabaseError("Failed to insert listing");
    return row;
  }

  async getById(listingId: string): Promise<ListingRow | undefined> {
    return this.queryOne<ListingRow>(LISTING_GET_BY_ID_SQL, [listingId]);
  }
}

// ── Violation Repository ────────────────────────────────────────────

export interface AgentViolation {
  policySection: string;
  severity: string;
  description: string;
}

export interface IViolationRepository {
  insertMany(
    reviewId: string,
    violations: AgentViolation[],
    client?: PoolClient,
  ): Promise<ViolationRow[]>;
}

export class ViolationRepository
  extends BaseRepository
  implements IViolationRepository
{
  async insertMany(
    reviewId: string,
    violations: AgentViolation[],
    client?: PoolClient,
  ): Promise<ViolationRow[]> {
    if (violations.length === 0) return [];

    const params: unknown[] = [];
    const valuePlaceholders = violations.map((v) => {
      const offset = params.length + 1;
      params.push(reviewId, v.policySection, v.severity, v.description);
      return `($${offset}, $${offset + 1}, $${offset + 2}::severity, $${offset + 3})`;
    });

    const sql = `INSERT INTO violations (review_id, policy_section, severity, description)
       VALUES ${valuePlaceholders.join(", ")} RETURNING *`;

    if (client) {
      return this.query<ViolationRow>(sql, params, client);
    }

    return executeInTransaction((txClient) =>
      this.query<ViolationRow>(sql, params, txClient),
    );
  }
}

// ── Submission Service ──────────────────────────────────────────────

interface SubmitListingInput {
  title: string;
  description: string;
  category: string;
  imageUrls?: string[] | undefined;
  metadata?: Record<string, unknown> | undefined;
  tenantId?: string | undefined;
}

const STALE_THRESHOLD_MS = 2 * 60 * 1000;

export type EnqueueReviewFn = (data: ReviewJobData) => Promise<string>;

export class ReviewService {
  constructor(
    private readonly reviewRepo: IReviewRepository,
    private readonly listingRepo: IListingRepository,
    private readonly enqueueReview: EnqueueReviewFn,
  ) {}

  async submit(input: SubmitListingInput): Promise<{ reviewId: string }> {
    const tenantId = input.tenantId ?? DEFAULT_TENANT_ID;

    const { listing, review } = await executeInTransaction(async (client) => {
      const newListing = await this.listingRepo.insert(
        {
          tenantId,
          title: input.title,
          description: input.description,
          category: input.category,
          imageUrls: input.imageUrls ?? [],
          metadata: input.metadata ?? {},
        },
        client,
      );
      const newReview = await this.reviewRepo.insert(newListing.id, client);
      return { listing: newListing, review: newReview };
    });

    await this.enqueueReview({
      reviewId: review.id,
      listingId: listing.id,
      tenantId,
    });

    return { reviewId: review.id };
  }

  async getStatus(reviewId: string): Promise<ReviewStatusOutput> {
    const review = await this.reviewRepo.getById(reviewId);
    if (!review) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Review ${reviewId} not found`,
      });
    }

    const isStuck =
      review.status === "pending" &&
      Date.now() - review.created_at.getTime() > STALE_THRESHOLD_MS;

    if (isStuck) {
      await this.reviewRepo.updateStatus(review.id, "routing");
      const listing = await this.listingRepo.getById(review.listing_id);
      await this.enqueueReview({
        reviewId: review.id,
        listingId: review.listing_id,
        tenantId: listing?.tenant_id ?? DEFAULT_TENANT_ID,
      });
    }

    const result: ReviewStatusOutput = {
      reviewId: review.id,
      status: review.status,
      verdict: review.verdict,
      confidence: review.confidence,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
    };
    return result;
  }
}
