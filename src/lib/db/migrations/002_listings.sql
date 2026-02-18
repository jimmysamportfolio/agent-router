CREATE TABLE listings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  category    TEXT NOT NULL,
  image_urls  TEXT[] DEFAULT '{}',
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
