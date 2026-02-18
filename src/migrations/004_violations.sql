CREATE TABLE violations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id      UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  policy_section TEXT NOT NULL,
  severity       severity NOT NULL,
  description    TEXT NOT NULL
);

CREATE INDEX idx_violations_review_id ON violations(review_id);
