export type ReviewStatus =
  | "pending"
  | "routing"
  | "scanning"
  | "aggregating"
  | "complete"
  | "escalated"
  | "failed";

export type Verdict = "approved" | "rejected" | "escalated";

export type Severity = "low" | "medium" | "high" | "critical";

export interface ListingRow {
  id: string;
  title: string;
  description: string;
  category: string;
  image_urls: string[];
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface ReviewRow {
  id: string;
  listing_id: string;
  status: ReviewStatus;
  verdict: Verdict | null;
  confidence: number | null;
  explanation: string | null;
  trace: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface ViolationRow {
  id: string;
  review_id: string;
  policy_section: string;
  severity: Severity;
  description: string;
}
