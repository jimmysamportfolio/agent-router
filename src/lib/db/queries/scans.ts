import { query, queryOne } from "@/lib/db/pool";
import type { ViolationRow } from "@/lib/types";
import type { ScanResultOutput } from "@/lib/types";

interface ScanRow {
  review_id: string;
  review_status: string;
  review_verdict: string | null;
  review_confidence: number | null;
  review_explanation: string | null;
  review_trace: Record<string, unknown>;
  review_created_at: Date;
  review_updated_at: Date;
  listing_id: string;
  listing_title: string;
  listing_description: string;
  listing_category: string;
  listing_image_urls: string[];
}

const SCAN_QUERY_SQL = `
  SELECT
    r.id AS review_id, r.status AS review_status, r.verdict AS review_verdict,
    r.confidence AS review_confidence, r.explanation AS review_explanation,
    r.trace AS review_trace, r.created_at AS review_created_at, r.updated_at AS review_updated_at,
    l.id AS listing_id, l.title AS listing_title, l.description AS listing_description,
    l.category AS listing_category, l.image_urls AS listing_image_urls
  FROM reviews r
  JOIN listings l ON l.id = r.listing_id
  WHERE r.id = $1`;

const VIOLATIONS_QUERY_SQL = `
  SELECT id, review_id, policy_section, severity, description
  FROM violations WHERE review_id = $1`;

export async function getScanByReviewId(
  reviewId: string
): Promise<ScanResultOutput | undefined> {
  const row = await queryOne<ScanRow>(SCAN_QUERY_SQL, [reviewId]);
  if (!row) return undefined;

  const violations = await query<ViolationRow>(VIOLATIONS_QUERY_SQL, [reviewId]);

  return {
    review: {
      reviewId: row.review_id,
      status: row.review_status as ScanResultOutput["review"]["status"],
      verdict: row.review_verdict as ScanResultOutput["review"]["verdict"],
      confidence: row.review_confidence,
      explanation: row.review_explanation,
      trace: row.review_trace,
      createdAt: row.review_created_at,
      updatedAt: row.review_updated_at,
    },
    listing: {
      id: row.listing_id,
      title: row.listing_title,
      description: row.listing_description,
      category: row.listing_category,
      imageUrls: row.listing_image_urls,
    },
    violations: violations.map((v) => ({
      id: v.id,
      policySection: v.policy_section,
      severity: v.severity,
      description: v.description,
    })),
  };
}
