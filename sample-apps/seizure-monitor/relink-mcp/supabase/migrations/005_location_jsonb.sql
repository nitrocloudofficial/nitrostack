-- Revert location from JSONB back to GEOGRAPHY(POINT) with PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE factories DROP COLUMN IF EXISTS location;
ALTER TABLE factories ADD COLUMN location GEOGRAPHY(POINT);

CREATE INDEX IF NOT EXISTS idx_factories_location ON factories USING GIST (location);
