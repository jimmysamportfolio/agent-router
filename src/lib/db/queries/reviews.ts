import type { PoolClient } from "pg";
import { queryOne } from "@/lib/db/pool";
import type { ReviewRow } from "@/lib/types";

const INSERT_REVIEW_SQL = `INSERT INTO reviews (listing_id) VALUES ($1) RETURNING *`;

export async function insertReview(
  listingId: string,
  client?: PoolClient
): Promise<ReviewRow> {
  if (client) {
    const { rows } = await client.query<ReviewRow>(INSERT_REVIEW_SQL, [listingId]);
    if (!rows[0]) throw new Error("Failed to insert review");
    return rows[0];
  }

  const row = await queryOne<ReviewRow>(INSERT_REVIEW_SQL, [listingId]);
  if (!row) throw new Error("Failed to insert review");
  return row;
}

export async function getReviewById(
  reviewId: string
): Promise<ReviewRow | undefined> {
  return queryOne<ReviewRow>(`SELECT * FROM reviews WHERE id = $1`, [reviewId]);
}
