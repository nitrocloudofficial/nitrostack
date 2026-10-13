ALTER TABLE listings ADD COLUMN IF NOT EXISTS digital_passport JSONB;

CREATE INDEX IF NOT EXISTS idx_listings_passport ON listings USING gin (digital_passport);
