import type { PoolClient } from "pg";
import type { ListingRow } from "@/types";
import { BaseRepository } from "@/lib/db/base.repository";
import { DatabaseError } from "@/lib/errors";

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

const INSERT_SQL = `
  INSERT INTO listings (tenant_id, title, description, category, image_urls, metadata)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING ${LISTING_COLUMNS}`;

const GET_BY_ID_SQL = `SELECT ${LISTING_COLUMNS} FROM listings WHERE id = $1`;

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

    if (client) {
      const row = await this.queryOneWithClient<ListingRow>(
        client,
        INSERT_SQL,
        params,
      );
      if (!row) throw new DatabaseError("Failed to insert listing");
      return row;
    }

    const row = await this.queryOne<ListingRow>(INSERT_SQL, params);
    if (!row) throw new DatabaseError("Failed to insert listing");
    return row;
  }

  async getById(listingId: string): Promise<ListingRow | undefined> {
    return this.queryOne<ListingRow>(GET_BY_ID_SQL, [listingId]);
  }
}
