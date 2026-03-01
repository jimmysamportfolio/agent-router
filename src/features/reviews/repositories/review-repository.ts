import { BaseRepository } from "@/lib/db/base.repository";
import { DatabaseError } from "@/lib/errors";
import { PoolClient } from "pg";

export interface ReviewRow {
  id: string;
  listing_id: string;
  status: ReviewStatus;
  verdict: Verdict | null;
  confidence: number | null;
  explanation: string | null;
  trace: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export type ReviewStatus =
  | "pending"
  | "routing"
  | "complete"
  | "escalated"
  | "failed";

export type Verdict = "approved" | "rejected" | "escalated";

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

export class ReviewRepository
  extends BaseRepository
  implements IReviewRepository
{
  private static readonly COLUMNS =
    "id, listing_id, status, verdict, confidence, explanation, trace, created_at, updated_at";
  private static readonly INSERT_SQL = `INSERT INTO reviews (listing_id) VALUES ($1) RETURNING ${ReviewRepository.COLUMNS}`;
  private static readonly GET_BY_ID_SQL = `SELECT ${ReviewRepository.COLUMNS} FROM reviews WHERE id = $1`;
  private static readonly UPDATE_STATUS_SQL = `UPDATE reviews SET status = $1, trace = COALESCE($2, trace), updated_at = NOW() WHERE id = $3 RETURNING ${ReviewRepository.COLUMNS}`;
  private static readonly UPDATE_VERDICT_SQL = `UPDATE reviews SET verdict = $1, confidence = $2, explanation = $3, trace = $4, status = $5, updated_at = NOW() WHERE id = $6 RETURNING ${ReviewRepository.COLUMNS}`;
  private static readonly COMPLETE_STATUS: ReviewStatus = "complete";

  async insert(listingId: string, client?: PoolClient): Promise<ReviewRow> {
    const row = await this.queryOne<ReviewRow>(
      ReviewRepository.INSERT_SQL,
      [listingId],
      client,
    );
    if (!row) throw new DatabaseError("Failed to insert review");
    return row;
  }

  async getById(reviewId: string): Promise<ReviewRow | undefined> {
    return this.queryOne<ReviewRow>(ReviewRepository.GET_BY_ID_SQL, [reviewId]);
  }

  async updateStatus(
    reviewId: string,
    status: ReviewStatus,
    trace?: Record<string, unknown>,
    client?: PoolClient,
  ): Promise<ReviewRow> {
    const row = await this.queryOne<ReviewRow>(
      ReviewRepository.UPDATE_STATUS_SQL,
      [status, trace ?? null, reviewId],
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
    const row = await this.queryOne<ReviewRow>(
      ReviewRepository.UPDATE_VERDICT_SQL,
      [
        verdict,
        confidence,
        explanation,
        trace,
        ReviewRepository.COMPLETE_STATUS,
        reviewId,
      ],
      client,
    );
    if (!row) throw new DatabaseError("Failed to update review verdict");
    return row;
  }
}
