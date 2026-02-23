import { queryOne } from "@/lib/db/pool";
import { DatabaseError } from "@/lib/errors";
import type { TenantRow } from "@/lib/types";

export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

const GET_TENANT_BY_ID_SQL = `SELECT * FROM tenants WHERE id = $1`;

const GET_TENANT_BY_SLUG_SQL = `SELECT * FROM tenants WHERE slug = $1`;

const INSERT_TENANT_SQL = `INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING *`;

export async function getTenantById(
  tenantId: string,
): Promise<TenantRow | undefined> {
  return queryOne<TenantRow>(GET_TENANT_BY_ID_SQL, [tenantId]);
}

export async function getTenantBySlug(
  slug: string,
): Promise<TenantRow | undefined> {
  return queryOne<TenantRow>(GET_TENANT_BY_SLUG_SQL, [slug]);
}

export async function insertTenant(input: {
  name: string;
  slug: string;
}): Promise<TenantRow> {
  const row = await queryOne<TenantRow>(INSERT_TENANT_SQL, [
    input.name,
    input.slug,
  ]);
  if (!row) throw new DatabaseError("Failed to insert tenant");
  return row;
}
