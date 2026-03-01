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
