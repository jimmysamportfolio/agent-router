import { BaseRepository } from "@/lib/db/base.repository";
import { DatabaseError } from "@/lib/errors";
import { PoolClient } from "pg";

export interface ListingRow {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  category: string;
  image_urls: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

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

export class ListingRepository
  extends BaseRepository
  implements IListingRepository
{
  private static readonly COLUMNS = `id, tenant_id, title, description, category, image_urls, metadata, created_at`;
  private static readonly INSERT_SQL = `
INSERT INTO listings (tenant_id, title, description, category, image_urls, metadata)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING ${ListingRepository.COLUMNS}`;
  private static readonly GET_BY_ID_SQL = `SELECT ${ListingRepository.COLUMNS} FROM listings WHERE id = $1`;

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
      ListingRepository.INSERT_SQL,
      params,
      client,
    );
    if (!row) throw new DatabaseError("Failed to insert listing");
    return row;
  }

  async getById(listingId: string): Promise<ListingRow | undefined> {
    return this.queryOne<ListingRow>(ListingRepository.GET_BY_ID_SQL, [
      listingId,
    ]);
  }
}
