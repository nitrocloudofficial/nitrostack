# 3D Visual Twin and Telemetry Mapping Guide

This guide describes how to configure, generate, and run the **3D Visual Twin Visualization and Telemetry Mapping Engine** in the DTaaS platform. These capabilities enable you to generate interactive 3D WebGL scenes for IoT devices based on their telemetry schema, dynamically mapping database values to 3D properties (like mesh rotation speed, opacity, scale, and color gradients) and displaying a dynamic metric sidebar with automated unit formatting.

---

## Architecture Overview

The visualization pipeline reads the latest telemetry from the local database, correlates it with a visual mapping config, compiles a Three.js scene, and generates a standalone, interactive HTML file.

```
          ThingsBoard Device Telemetry (battery, humidity, pressure, temp)
                           │
                           ▼ [Telemetry Sync]
                    Neon PostgreSQL (`device_telemetry`)
                           │
                           ├─► Telemetry Schema Service (`telemetry_schemas`)
                           │
                           ▼
                 Visual Mapping Config (`visual_mappings`)
                           │
                           ▼ [Visualization Tools Engine]
                Dynamic HTML Scene (Three.js WebGL)
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
      3D Primitive Shapes        Dynamic Metric Sidebar
     (Mesh position, color,      (Real-time database snapshot
      rotation, and scale)       with units: °C, %, V, A, W, etc.)
```

---

## Core Schema and Configurations

### 1. Telemetry Schemas Table (`telemetry_schemas`)
Defines the expected metrics, units, and ranges for a device type. Used by the AI mapping agent to understand what telemetry fields are available.
* **Fields:**
  * `device_type` (String, Primary Key): The device classification.
  * `schema` (JSON): The metric definitions, containing:
    ```json
    {
      "deviceType": "Smart Light",
      "metrics": [
        {
          "name": "temperature",
          "unit": "°C",
          "expectedRange": { "min": 10, "max": 45 }
        }
      ]
    }
    ```

### 2. Visual Mappings Table (`visual_mappings`)
Links 3D shapes to telemetry properties. Stored mappings can be in `draft` or `published` state.
* **Fields:**
  * `device_type` (String, Primary Key): Associated device classification.
  * `mapping` (JSON): Layout structure and mappings:
    * `shape`: Composite 3D mesh definitions (base, stand, impeller, bulb, etc.) assembled from primitive shapes (`box`, `sphere`, `cylinder`).
    * `mappings`: Binds metrics to mesh parameters (`color`, `opacity`, `scaleY`, `rotationSpeed`) with output ranges.
    * `status` (String): Draft or published status.

---

## 🛠️ MCP Visualization Tools Reference

### 1. `generate_visual_mapping`
Calls the AI Agent to design a 3D composite shape and map telemetry fields onto it based on the registered schema.
* **Parameters:**
  * `deviceType` (string, required): IoT device category (e.g. `Smart Light`).
* **Example Input:**
  ```json
  {
    "deviceType": "Smart Light"
  }
  ```

### 2. `preview_visual_mapping`
Generates a mock static HTML page using midpoint values from telemetry ranges. Useful for testing the 3D model look-and-feel without active database data.
* **Parameters:**
  * `deviceType` (string, required)

### 3. `get_device_3d_view`
Assembles the real visual twin page for a specific device, loading its actual live database telemetry snapshot.
* **Parameters:**
  * `deviceId` (string, required): ThingsBoard Device UUID.
  * `deviceType` (string, required): Device category.

---

## 💡 Dynamic Metric Sidebar Features

When compiling the WebGL page, the engine dynamically builds a metric sidebar. The sidebar has these key behaviors:

1. **Strict Key Matching:** Only metrics mapped to 3D parts are listed. Fake mockup metrics are omitted.
2. **Auto Unit Detection:** The unit detector automatically matches metric names to format values cleanly:
   * `temp` ➔ `°C`
   * `rpm` ➔ `RPM`
   * `pressure` ➔ `hPa` or `bar` (decided by magnitude)
   * `flow` ➔ `GPM`
   * `vibration` ➔ `mm/s`
   * `humid`/`batter`/`level`/`charge` ➔ `%`
   * `volt` ➔ `V`
   * `curr` ➔ `A`
   * `power`/`watt` ➔ `W`
3. **Graceful Offline States:** If the device has no database readings, the sidebar outputs `NONE` or displays a red `⚠️ NO DATA` warning panel.

---

## Quickstart: Creating a Real Twin

To create and verify a dynamic 3D twin for a new device:

### Step 1: Register and Ingest Telemetry
Register the device ID and sync its telemetry into Neon PostgreSQL:
```json
// Call register_device_for_sync
{
  "deviceId": "c5cef300-8888-11f1-8b3b-037118875eb0",
  "syncIntervalSeconds": 30
}

// Call sync_device_now to run immediate sync
{
  "deviceId": "c5cef300-8888-11f1-8b3b-037118875eb0"
}
```

### Step 2: Establish the Mapping
Create the visual mapping using either `generate_visual_mapping` or save it manually.

### Step 3: Render the Interactive HTML File
Call `get_device_3d_view` to retrieve the Three.js HTML. Save the text to a local file (e.g. `water_meter.html`) and open it in any browser to interact with the live model.
