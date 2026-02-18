-- SECURITY NOTE: The 'secret' column stores ENCRYPTED webhook secrets.
-- Application layer MUST:
--   1. Encrypt secrets using AES-256-GCM before INSERT/UPDATE
--   2. Use envelope encryption with key from KMS/Vault (e.g., AWS KMS, HashiCorp Vault)
--   3. Decrypt only when needed for HMAC signing of webhook payloads
--   4. Implement key rotation policy (recommend 90-day rotation)
--   5. Never log or expose decrypted secrets
-- The database stores only the encrypted ciphertext, not plaintext secrets.

CREATE TABLE webhook_registrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url         TEXT NOT NULL,
  event_types TEXT[] NOT NULL DEFAULT '{}',
  secret      TEXT NOT NULL,  -- Stores AES-256-GCM encrypted secret (base64-encoded ciphertext)
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN webhook_registrations.secret IS 
  'Encrypted webhook secret (AES-256-GCM). Must be encrypted by application layer before storage using envelope encryption with KMS/Vault. Decrypt only for HMAC signing. Key rotation policy: 90 days.';
