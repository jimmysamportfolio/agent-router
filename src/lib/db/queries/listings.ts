import type { PoolClient } from "pg";
import { queryOne } from "@/lib/db/pool";
import { DatabaseError } from "@/lib/errors";
import type { ListingRow } from "@/lib/types";

export interface InsertListingInput {
  tenantId: string;
  title: string;
  description: string;
  category: string;
  imageUrls: string[];
  metadata: Record<string, unknown>;
}

const LISTING_COLUMNS =
  "id, tenant_id, title, description, category, image_urls, metadata, created_at";

const INSERT_LISTING_SQL = `
  INSERT INTO listings (tenant_id, title, description, category, image_urls, metadata)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING ${LISTING_COLUMNS}`;

const GET_LISTING_BY_ID_SQL = `SELECT ${LISTING_COLUMNS} FROM listings WHERE id = $1`;

export async function insertListing(
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

  if (client) {
    const { rows } = await client.query<ListingRow>(INSERT_LISTING_SQL, params);
    if (!rows[0]) throw new DatabaseError("Failed to insert listing");
    return rows[0];
  }

  const row = await queryOne<ListingRow>(INSERT_LISTING_SQL, params);
  if (!row) throw new DatabaseError("Failed to insert listing");
  return row;
}

export async function getListingById(
  listingId: string,
): Promise<ListingRow | undefined> {
  return queryOne<ListingRow>(GET_LISTING_BY_ID_SQL, [listingId]);
}
