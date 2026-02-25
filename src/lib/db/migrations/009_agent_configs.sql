CREATE TABLE agent_configs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id),
  name                   TEXT NOT NULL,
  display_name           TEXT NOT NULL,
  system_prompt_template TEXT NOT NULL,
  policy_source_files    TEXT[] NOT NULL DEFAULT '{}',
  options                JSONB NOT NULL DEFAULT '{}',
  is_active              BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX idx_agent_configs_tenant_active
  ON agent_configs (tenant_id) WHERE is_active = true;
