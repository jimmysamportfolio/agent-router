import type { PoolClient } from "pg";
import { queryOne } from "@/lib/db/pool";
import type { ListingRow } from "@/lib/types";

export interface InsertListingInput {
  title: string;
  description: string;
  category: string;
  imageUrls: string[];
  metadata: Record<string, unknown>;
}

const INSERT_LISTING_SQL = `
  INSERT INTO listings (title, description, category, image_urls, metadata)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING *`;

export async function insertListing(
  input: InsertListingInput,
  client?: PoolClient,
): Promise<ListingRow> {
  const params = [
    input.title,
    input.description,
    input.category,
    input.imageUrls,
    input.metadata,
  ];

  if (client) {
    const { rows } = await client.query<ListingRow>(INSERT_LISTING_SQL, params);
    if (!rows[0]) throw new Error("Failed to insert listing");
    return rows[0];
  }

  const row = await queryOne<ListingRow>(INSERT_LISTING_SQL, params);
  if (!row) throw new Error("Failed to insert listing");
  return row;
}
