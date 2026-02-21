import type { PoolClient } from "pg";
import { queryOne } from "@/lib/db/pool";
import { DatabaseError } from "@/lib/errors";
import type { ReviewRow, ReviewStatus, Verdict } from "@/lib/types";

const INSERT_REVIEW_SQL = `INSERT INTO reviews (listing_id) VALUES ($1) RETURNING *`;

export async function insertReview(
  listingId: string,
  client?: PoolClient,
): Promise<ReviewRow> {
  if (client) {
    const { rows } = await client.query<ReviewRow>(INSERT_REVIEW_SQL, [
      listingId,
    ]);
    if (!rows[0]) throw new DatabaseError("Failed to insert review");
    return rows[0];
  }

  const row = await queryOne<ReviewRow>(INSERT_REVIEW_SQL, [listingId]);
  if (!row) throw new DatabaseError("Failed to insert review");
  return row;
}

export async function getReviewById(
  reviewId: string,
): Promise<ReviewRow | undefined> {
  return queryOne<ReviewRow>(`SELECT * FROM reviews WHERE id = $1`, [reviewId]);
}

const UPDATE_REVIEW_STATUS_SQL = `UPDATE reviews SET status = $1, trace = COALESCE($2, trace), updated_at = NOW() WHERE id = $3 RETURNING *`;

export async function updateReviewStatus(
  reviewId: string,
  status: ReviewStatus,
  trace?: Record<string, unknown>,
  client?: PoolClient,
): Promise<ReviewRow> {
  const params = [status, trace ?? null, reviewId];

  if (client) {
    const { rows } = await client.query<ReviewRow>(
      UPDATE_REVIEW_STATUS_SQL,
      params,
    );
    if (!rows[0]) throw new DatabaseError("Failed to update review status");
    return rows[0];
  }

  const row = await queryOne<ReviewRow>(UPDATE_REVIEW_STATUS_SQL, params);
  if (!row) throw new DatabaseError("Failed to update review status");
  return row;
}

const UPDATE_REVIEW_VERDICT_SQL = `UPDATE reviews SET verdict = $1, confidence = $2, explanation = $3, trace = $4, status = 'complete', updated_at = NOW() WHERE id = $5 RETURNING *`;

export async function updateReviewVerdict(
  reviewId: string,
  verdict: Verdict,
  confidence: number,
  explanation: string,
  trace: Record<string, unknown>,
  client?: PoolClient,
): Promise<ReviewRow> {
  const params = [verdict, confidence, explanation, trace, reviewId];

  if (client) {
    const { rows } = await client.query<ReviewRow>(
      UPDATE_REVIEW_VERDICT_SQL,
      params,
    );
    if (!rows[0]) throw new DatabaseError("Failed to update review verdict");
    return rows[0];
  }

  const row = await queryOne<ReviewRow>(UPDATE_REVIEW_VERDICT_SQL, params);
  if (!row) throw new DatabaseError("Failed to update review verdict");
  return row;
}
