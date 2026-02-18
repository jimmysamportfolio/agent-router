CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  status      review_status NOT NULL DEFAULT 'pending',
  verdict     verdict,
  confidence  REAL,
  explanation TEXT,
  trace       JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_status     ON reviews(status);
CREATE INDEX idx_reviews_listing_id ON reviews(listing_id);
