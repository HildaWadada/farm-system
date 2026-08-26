-- Farm Management Platform — Postgres Schema
-- Two roles only: owner (read-only + user management), supervisor (full data entry)
-- No public sign-up. Accounts are created manually via seed.py, never through the app.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()

CREATE TYPE user_role AS ENUM ('owner', 'supervisor');
CREATE TYPE activity_type AS ENUM ('spray', 'weed', 'irrigate', 'fertilize', 'harvest', 'issue');
CREATE TYPE crop_type AS ENUM ('dragon_fruit', 'citrus', 'hass_avocado', 'chilli');
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'cancelled');
CREATE TYPE alert_status AS ENUM ('open', 'resolved');

-- ─────────────────────────────────────────────
-- Users: only ever 2 rows for now (owner, supervisor). Created by seed.py.
-- ─────────────────────────────────────────────
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    email               TEXT NOT NULL UNIQUE,
    password_hash       TEXT NOT NULL,
    role                user_role NOT NULL,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,  -- forces password change on first login
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Workers: field workers/labourers. Saved once by the supervisor, then reused on future
-- entries by picking from a list — no need to re-enter their details each time.
-- ─────────────────────────────────────────────
CREATE TABLE workers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    phone       TEXT,
    role        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Activities: the single feed. Every spray/weed/irrigate/fertilize/harvest/issue entry.
-- Logged only by supervisor. Owner reads this table, never writes to it.
-- ─────────────────────────────────────────────
CREATE TABLE activities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    logged_by       UUID NOT NULL REFERENCES users(id),   -- always the supervisor's account
    worker_id       UUID REFERENCES workers(id),           -- the worker who performed the activity
    activity_type   activity_type NOT NULL,
    crop            crop_type NOT NULL,
    block           TEXT,                                  -- e.g. "C2"
    quantity_kg     NUMERIC(10,2),                          -- relevant mainly for harvest
    photo_url       TEXT,
    notes           TEXT,                                  -- e.g. issue description
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_crop ON activities(crop);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_activities_worker ON activities(worker_id);

-- ─────────────────────────────────────────────
-- Alerts: derived from activities where activity_type = 'issue'.
-- Kept as its own table so it can carry a status (open/resolved) that activities doesn't need.
-- ─────────────────────────────────────────────
CREATE TABLE alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id     UUID NOT NULL REFERENCES activities(id),
    status          alert_status NOT NULL DEFAULT 'open',
    resolved_at     TIMESTAMPTZ,
    resolution_note TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Buyers: passive contact records. Buyers never log in — supervisor creates/edits these.
-- ─────────────────────────────────────────────
CREATE TABLE buyers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    phone       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Orders: a sale. Always created by the supervisor against live stock.
-- ─────────────────────────────────────────────
CREATE TABLE orders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id    UUID NOT NULL REFERENCES buyers(id),
    crop        crop_type NOT NULL,
    quantity_kg NUMERIC(10,2) NOT NULL,
    price       NUMERIC(12,2) NOT NULL,
    status      order_status NOT NULL DEFAULT 'pending',
    logged_by   UUID NOT NULL REFERENCES users(id),   -- always the supervisor
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);

-- ─────────────────────────────────────────────
-- Convenience view: live stock per crop = total harvested minus total sold (non-cancelled)
-- ─────────────────────────────────────────────
CREATE VIEW live_stock AS
SELECT
    h.crop,
    COALESCE(SUM(h.quantity_kg), 0) - COALESCE(s.sold, 0) AS available_kg
FROM (
    SELECT crop, SUM(quantity_kg) AS quantity_kg
    FROM activities
    WHERE activity_type = 'harvest'
    GROUP BY crop
) h
LEFT JOIN (
    SELECT crop, SUM(quantity_kg) AS sold
    FROM orders
    WHERE status != 'cancelled'
    GROUP BY crop
) s ON s.crop = h.crop
GROUP BY h.crop, s.sold;
