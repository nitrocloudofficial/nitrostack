# Device Synchronization and Telemetry Analytics Guide

This guide describes how to use and configure the automatic Device Synchronization, Historical Telemetry Storage, and Analytics Engine in the DTaaS platform. These capabilities enable you to ingest device telemetry from ThingsBoard, persist it locally in Neon PostgreSQL, and run advanced historical queries, statistical aggregations, and machine learning dataset generation directly.

---

## Architecture Overview

The telemetry synchronization pipeline operates using a local cache store (Neon PostgreSQL) to optimize data access, avoid rate-limiting/performance overhead on the ThingsBoard API, and enable custom offline analytics.

```
                    ThingsBoard Cloud
                           │
                           ▼ [Continuous HTTPS Fetch]
                Background Sync Service
                           │
            [Incremental Time-series Telemetry]
                           │
                           ▼
                     Neon Database
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
 Historical Query      Statistics      Dataset Exports (CSV/JSON)
  (Neon Store)        (Calculations)    (Machine Learning / Analysis)
```

---

## Core Components

### 1. Sync Registry Table (`device_sync_registry`)
Tracks which devices are scheduled for automatic telemetry downloads. It contains:
- `device_id` (String, Primary Key): The ThingsBoard Device UUID.
- `enabled` (Boolean): Current active sync state.
- `sync_interval_seconds` (Integer): Period between synchronization ticks (default is 30s).
- `last_synced_timestamp` (Bigint): Timestamp of the last successful telemetry point fetched (epoch ms).
- `last_sync_status` (String): Status code of the last sync run (`success`, `error`, `initialized`, `paused`).
- `last_sync_error` (Text): Detailed error logs if the sync failed.

### 2. Telemetry Storage Table (`device_telemetry`)
Stores the raw time-series data locally:
- `id` (Serial, Primary Key): Row identifier.
- `device_id` (String): Associated device identifier.
- `metric` (String): Telemetry key/metric name (e.g. `temperature`, `humidity`, `voltage`).
- `value` (Double Precision): Numerical metric reading.
- `timestamp` (Bigint): Epoch millisecond timestamp.

---

## 🛠️ MCP Sync Tools Reference

### 1. `register_device_for_sync`
Registers a ThingsBoard device for continuous background telemetry ingestion.
* **Parameters:**
  * `deviceId` (string, required): ThingsBoard Device UUID.
  * `syncIntervalSeconds` (number, optional, default: 30): Sync rate in seconds.
* **Example Input:**
  ```json
  {
    "deviceId": "238a6040-886d-11f1-a3bc-95bc3f4b3917",
    "syncIntervalSeconds": 10
  }
  ```

### 2. `unregister_device_for_sync`
Unregisters a device and stops background telemetry synchronization, removing its configuration entry.
* **Parameters:**
  * `deviceId` (string, required): ThingsBoard Device UUID.

### 3. `pause_device_sync` / `resume_device_sync`
Pauses or resumes telemetry collection without deleting the device's registry metadata.
* **Parameters:**
  * `deviceId` (string, required)

### 4. `get_device_sync_status`
Retrieves execution details, intervals, and recent logs/errors for a sync job.
* **Example Response:**
  ```json
  {
    "success": true,
    "status": {
      "enabled": true,
      "lastSyncedTimestamp": 1784993258000,
      "lastSyncStatus": "success",
      "lastSyncError": null,
      "syncIntervalSeconds": 10
    }
  }
  ```

### 5. `sync_device_now`
Triggers an immediate, out-of-band incremental telemetry sync.
* **Parameters:**
  * `deviceId` (string, required)
* **Returns:**
  * `rowCount` (number): Number of new telemetry rows saved in the local database.

### 6. `backfill_device_history`
Manually backfills historical data from ThingsBoard into Neon for a custom time range. This operates independently of the background scheduler and does not update `lastSyncedTimestamp`.
* **Parameters:**
  * `deviceId` (string, required)
  * `keys` (array of strings, required): Telemetry metrics to backfill.
  * `startTs` (number, required): Start time in milliseconds.
  * `endTs` (number, required): End time in milliseconds.

---

## 📊 MCP Analytics Tools Reference

### 1. `query_device_history`
Fetches historical telemetry for a device directly from the Neon local database.
* **Parameters:**
  * `deviceId` (string, required)
  * `metrics` (array of strings or comma-separated string, required): Metrics to fetch.
  * `startTs` (number, required)
  * `endTs` (number, required)

### 2. `get_device_statistics`
Computes statistical calculations (`minimum`, `maximum`, `average`, `median`, `standardDeviation`, `sampleCount`) in a single query execution inside the PostgreSQL engine.
* **Parameters:**
  * `deviceId` (string, required)
  * `metric` (string, required): The target metric name.
  * `startTs` (number, required)
  * `endTs` (number, required)
* **Example Response:**
  ```json
  {
    "success": true,
    "stats": {
      "deviceId": "238a6040-886d-11f1-a3bc-95bc3f4b3917",
      "metric": "temperature",
      "sampleCount": 1420,
      "minimum": 18.4,
      "maximum": 31.9,
      "average": 24.32,
      "median": 24.1,
      "standardDeviation": 3.12,
      "firstTimestamp": 1784993059000,
      "lastTimestamp": 1784993258000
    }
  }
  ```

### 3. `create_training_dataset`
Combines historical data across multiple devices and metrics into a chronologically sorted machine learning training dataset. Large ranges are read in chunks of 5000 rows.
* **Parameters:**
  * `deviceIds` (array or comma-separated string, required)
  * `metrics` (array or comma-separated string, required)
  * `startTs` (number, required)
  * `endTs` (number, required)
  * `format` (enum: `"CSV"`, `"JSON"`, required)

### 4. `export_device_csv`
Generates a downloadable CSV dataset in the server's `scratch/` directory and returns file details.
* **Returns:**
  * `filename` (string): Output CSV filename.
  * `rowCount` (number): Row count of the dataset.
  * `csvContent` (string): CSV string data.
