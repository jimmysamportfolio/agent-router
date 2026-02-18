CREATE TYPE review_status AS ENUM (
  'pending','routing','scanning','aggregating','complete','escalated','failed'
);
CREATE TYPE verdict AS ENUM ('approved','rejected','escalated');
CREATE TYPE severity AS ENUM ('low','medium','high','critical');
