-- Adds Vendors and Purchases, mirroring Buyers and Orders — for tracking what the farm
-- buys (fertilizer, chemicals, equipment, seedlings) rather than what it sells.
-- Reuses the existing order_status enum type since the values are identical
-- (pending, paid, cancelled). Safe to run on your existing database.

CREATE TABLE vendors (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    phone       TEXT,
    category    TEXT,                                    -- e.g. "Agrovet", "Equipment", "Seedlings"
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchases (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id   UUID NOT NULL REFERENCES vendors(id),
    item        TEXT NOT NULL,                            -- e.g. "NPK fertilizer", "Irrigation pipes"
    quantity    NUMERIC(10,2) NOT NULL,
    unit        TEXT,                                      -- e.g. "kg", "litres", "bags", "pieces"
    cost        NUMERIC(12,2) NOT NULL,
    status      order_status NOT NULL DEFAULT 'pending',
    logged_by   UUID NOT NULL REFERENCES users(id),        -- always the supervisor
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchases_created_at ON purchases(created_at DESC);
CREATE INDEX idx_purchases_vendor ON purchases(vendor_id);
