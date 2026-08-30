-- Adds an "Other" option for both Crop and Activity on the entry form, with a free-text
-- field to describe what it actually was. Safe to run on your existing database.

ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'other';
ALTER TYPE crop_type ADD VALUE IF NOT EXISTS 'other';

ALTER TABLE activities ADD COLUMN activity_type_other TEXT;
ALTER TABLE activities ADD COLUMN crop_other TEXT;
