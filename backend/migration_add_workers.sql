-- Adds worker records so the supervisor can save a worker once and reuse them on future entries.
-- Safe to run on your existing database — does not touch existing rows.

CREATE TABLE workers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    phone       TEXT,
    role        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE activities ADD COLUMN worker_id UUID REFERENCES workers(id);

CREATE INDEX idx_activities_worker ON activities(worker_id);
