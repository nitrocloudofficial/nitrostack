import { getAlert, getAlertHistory } from "../services/alert-state.js";
import { getMonitorState } from "../services/monitor-state.js";
import {
  getLiveVitals,
  getRespirationHistory,
} from "../services/live-state.js";
import { getCsiRingBuffer, getLatestCsiAmplitudes } from "../services/csi-ring-buffer.js";
import { packetRateTracker } from "../services/packet-rate-tracker.js";
import express from "express";
import cors from "cors";

import {
    guardianCore,
    deviceRegistry,
    sessionManager,
    guardianStateManager,
    websocketServer
} from "./context.js";

const app = express();

app.use(cors());
app.use(express.json());

/**
 * GET /api/status
 */
app.get("/api/status", (req, res) => {
    res.json(guardianStateManager.getState());
});

/**
 * GET /api/devices
 */
app.get("/api/devices", (req, res) => {
    res.json(deviceRegistry.getAllDevices());
});

/**
 * GET /api/sessions
 */
app.get("/api/sessions", (req, res) => {
    res.json(sessionManager.getAllSessions());
});

/**
 * POST /api/bridge
 */
app.post("/api/bridge", (req, res) => {

    try {

        const result = guardianCore.processBridgeMessage(req.body);

        res.json(result);

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err instanceof Error ? err.message : "Unknown error"
        });

    }

});
app.post("/api/device/register", (req, res) => {

    const { id, name } = req.body;

    if (!id || !name) {
        return res.status(400).json({
            success: false,
            message: "id and name are required"
        });
    }

    const device = deviceRegistry.registerDevice(id, name);

    guardianStateManager.updateState({
        connectedDevices: deviceRegistry.getAllDevices().length
    });

    res.json({
        success: true,
        device
    });
    websocketServer.broadcast({
    event: "DEVICE_REGISTERED",
    device
});

});
app.post("/api/device/heartbeat", (req, res) => {

    const { id } = req.body;

    if (!id) {
        return res.status(400).json({
            success: false,
            message: "id is required"
        });
    }

    deviceRegistry.updateHeartbeat(id);

    guardianStateManager.updateState({
        connectedDevices: deviceRegistry.getAllDevices().length
    });

    res.json({
        success: true
    });
    websocketServer.broadcast({
    event: "DEVICE_HEARTBEAT",
    id
});

});

const PORT = 5000;
app.post("/api/monitoring/start", (req, res) => {

    const { deviceId } = req.body;

    if (!deviceId) {
        return res.status(400).json({
            success: false,
            message: "deviceId is required"
        });
    }

    const session = sessionManager.createSession(deviceId);

    guardianStateManager.updateState({
        monitoringActive: true,
        activeSessions: sessionManager.getAllSessions().filter(s => s.monitoring).length
    });

    res.json({
        success: true,
        session
    });
    websocketServer.broadcast({
    event: "SESSION_STARTED",
    session
});

});
app.post("/api/monitoring/stop", (req, res) => {

    const { sessionId } = req.body;

    if (!sessionId) {
        return res.status(400).json({
            success: false,
            message: "sessionId is required"
        });
    }

    const stopped = sessionManager.stopSession(sessionId);

    guardianStateManager.updateState({
        monitoringActive: false,
        activeSessions: sessionManager.getAllSessions().filter(s => s.monitoring).length
    });

    res.json({
        success: stopped
    });
    websocketServer.broadcast({
    event: "SESSION_STOPPED",
    sessionId
});

});
app.get("/api/live", (req, res) => {
  res.json(getLiveVitals());
});
app.get("/api/live-history", (req, res) => {
  res.json(getRespirationHistory());
});
app.get("/api/monitor", (req, res) => {
  res.json(getMonitorState());
});
app.get("/api/alert", (req, res) => {
  res.json(getAlert());
});
app.get("/api/alert/history", (req, res) => {
  res.json(getAlertHistory());
});
app.get("/api/health", (req, res) => {
  const state = guardianStateManager.getState();
  res.json({
    online: state.backendOnline,
    websocketClients: websocketServer.clientCount,
    connectedDevices: state.connectedDevices,
    activeSessions: state.activeSessions,
    monitoringActive: state.monitoringActive,
    packetRate: packetRateTracker.getRate(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});
app.get("/api/csi/latest", (req, res) => {
  res.json({ amplitudes: getLatestCsiAmplitudes() });
});
app.get("/api/csi/history", (req, res) => {
  res.json(getCsiRingBuffer());
});
app.get("/api/packet-rate", (req, res) => {
  res.json({ packetRate: packetRateTracker.getRate() });
});
app.listen(PORT, () => {

    console.log(`Guardian REST API running on http://localhost:${PORT}`);

});