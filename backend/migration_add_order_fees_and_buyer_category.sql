-- Adds buyer categories, and order-level logistics fee, tax, and notification preferences.
-- Safe to run on your existing database — new columns default sensibly, existing rows unaffected.

ALTER TABLE buyers ADD COLUMN category TEXT;

ALTER TABLE orders ADD COLUMN logistics_fee NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN tax NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN notify_sms BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN notify_email BOOLEAN NOT NULL DEFAULT FALSE;
