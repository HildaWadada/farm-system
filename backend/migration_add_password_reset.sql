-- Adds password reset support, and safely re-confirms the "Other" option columns
-- from an earlier migration in case they weren't fully applied.
-- All statements are safe to re-run.

ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;

ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'other';
ALTER TYPE crop_type ADD VALUE IF NOT EXISTS 'other';

ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_type_other TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS crop_other TEXT;
