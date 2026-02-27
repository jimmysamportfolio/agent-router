export type ReviewStatus =
  | "pending"
  | "routing"
  | "complete"
  | "escalated"
  | "failed";

export type Verdict = "approved" | "rejected" | "escalated";

export type Severity = "low" | "medium" | "high" | "critical";

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

export interface ReviewRow {
  id: string;
  listing_id: string;
  status: ReviewStatus;
  verdict: Verdict | null;
  confidence: number | null;
  explanation: string | null;
  trace: Record<string, unknown> | null;
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

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: Date;
}

export interface AgentConfigRow {
  id: string;
  tenant_id: string;
  name: string;
  display_name: string;
  system_prompt_template: string;
  policy_source_files: string[];
  options: Record<string, unknown>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TenantPolicyChunkRow {
  id: string;
  tenant_id: string;
  source_file: string;
  chunk_index: number;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}
