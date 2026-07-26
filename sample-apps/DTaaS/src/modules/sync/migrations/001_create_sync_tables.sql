-- Create sync registry table
CREATE TABLE IF NOT EXISTS device_sync_registry (
    device_id VARCHAR(255) PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sync_interval_seconds INTEGER NOT NULL DEFAULT 30,
    last_synced_timestamp BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_sync_status VARCHAR(50),
    last_sync_error TEXT
);

-- Create telemetry readings table
CREATE TABLE IF NOT EXISTS device_telemetry (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    metric VARCHAR(255) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient querying by device, metric and timestamp
CREATE INDEX IF NOT EXISTS idx_device_telemetry_query 
ON device_telemetry (device_id, metric, timestamp);
