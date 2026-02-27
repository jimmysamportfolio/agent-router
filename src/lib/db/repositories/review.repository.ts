import type { PoolClient } from "pg";
import type { ReviewRow, ReviewStatus, Verdict } from "@/types";
import { BaseRepository } from "@/lib/db/base.repository";
import { DatabaseError } from "@/lib/errors";

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

const INSERT_SQL = `INSERT INTO reviews (listing_id) VALUES ($1) RETURNING *`;
const GET_BY_ID_SQL = `SELECT * FROM reviews WHERE id = $1`;
const UPDATE_STATUS_SQL = `UPDATE reviews SET status = $1, trace = COALESCE($2, trace), updated_at = NOW() WHERE id = $3 RETURNING *`;
const UPDATE_VERDICT_SQL = `UPDATE reviews SET verdict = $1, confidence = $2, explanation = $3, trace = $4, status = $5, updated_at = NOW() WHERE id = $6 RETURNING *`;
const COMPLETE_STATUS: ReviewStatus = "complete";

export class ReviewRepository
  extends BaseRepository
  implements IReviewRepository
{
  async insert(listingId: string, client?: PoolClient): Promise<ReviewRow> {
    if (client) {
      const row = await this.queryOneWithClient<ReviewRow>(client, INSERT_SQL, [
        listingId,
      ]);
      if (!row) throw new DatabaseError("Failed to insert review");
      return row;
    }

    const row = await this.queryOne<ReviewRow>(INSERT_SQL, [listingId]);
    if (!row) throw new DatabaseError("Failed to insert review");
    return row;
  }

  async getById(reviewId: string): Promise<ReviewRow | undefined> {
    return this.queryOne<ReviewRow>(GET_BY_ID_SQL, [reviewId]);
  }

  async updateStatus(
    reviewId: string,
    status: ReviewStatus,
    trace?: Record<string, unknown>,
    client?: PoolClient,
  ): Promise<ReviewRow> {
    const params = [status, trace ?? null, reviewId];

    if (client) {
      const row = await this.queryOneWithClient<ReviewRow>(
        client,
        UPDATE_STATUS_SQL,
        params,
      );
      if (!row) throw new DatabaseError("Failed to update review status");
      return row;
    }

    const row = await this.queryOne<ReviewRow>(UPDATE_STATUS_SQL, params);
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

    if (client) {
      const row = await this.queryOneWithClient<ReviewRow>(
        client,
        UPDATE_VERDICT_SQL,
        params,
      );
      if (!row) throw new DatabaseError("Failed to update review verdict");
      return row;
    }

    const row = await this.queryOne<ReviewRow>(UPDATE_VERDICT_SQL, params);
    if (!row) throw new DatabaseError("Failed to update review verdict");
    return row;
  }
}
