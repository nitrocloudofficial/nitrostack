import { spawn } from "node:child_process";
import http from "node:http";
import WebSocket from "ws";

const API_PORT = 5000;
const WS_PORT = 8080;
const BASE = `http://localhost:${API_PORT}`;

function get(path) {
  return new Promise((resolve, reject) => {
    http
      .get(`${BASE}${path}`, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve(JSON.parse(body)));
      })
      .on("error", reject);
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      `${BASE}${path}`,
      { method: "POST", headers: { "Content-Type": "application/json" } },
      (res) => {
        let out = "";
        res.on("data", (c) => (out += c));
        res.on("end", () => resolve(JSON.parse(out)));
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await get("/api/health");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw new Error("Server did not become ready in time");
}

async function main() {
  const server = spawn("node", ["dist/api/server.js"], {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  let failed = false;
  try {
    await waitForServer();
    console.log("[smoke] server ready");

    await post("/api/device/register", {
      id: "ESP32_S3_001",
      name: "Guardian Bridge",
    });
    await post("/api/monitoring/start", { deviceId: "ESP32_S3_001" });

    const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
    const liveUpdate = new Promise((resolve) => {
      ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.event === "LIVE_UPDATE") resolve(msg.data);
      });
    });
    await new Promise((r) => ws.on("open", r));

    const packet = {
      deviceId: "ESP32_S3_001",
      timestamp: new Date().toISOString(),
      rawPacket: {
        id: 1,
        mac: "1a:00:00:00:00:00",
        rssi: -36,
        channel: 11,
        noise_floor: -90,
        len: 5,
        local_timestamp: 12345,
        csi: [10, -20, 30, 5, -8, 12, -4, 3, -1, 9],
        schema: "s3",
      },
    };
    const bridgeResult = await post("/api/bridge", packet);
    console.log("[smoke] /api/bridge ->", JSON.stringify(bridgeResult));

    const liveData = await liveUpdate;
    console.log("[smoke] LIVE_UPDATE ->", JSON.stringify(liveData));

    const live = await get("/api/live");
    const monitor = await get("/api/monitor");
    const alert = await get("/api/alert");
    const health = await get("/api/health");
    const csi = await get("/api/csi/latest");

    console.log("[smoke] /api/live      ->", JSON.stringify(live));
    console.log("[smoke] /api/monitor   ->", JSON.stringify(monitor));
    console.log("[smoke] /api/alert     ->", JSON.stringify(alert));
    console.log("[smoke] /api/health    ->", JSON.stringify(health));
    console.log("[smoke] /api/csi/latest ->", JSON.stringify(csi));

    const checks = [
      ["bridge processed", bridgeResult?.processed === true],
      ["live respiration set", typeof live.respiration === "number"],
      ["monitor packet rate > 0", monitor.packetRate > 0],
      ["health websocketClients >= 1", health.websocketClients >= 1],
      ["csi amplitudes length", Array.isArray(csi.amplitudes) && csi.amplitudes.length === 10],
      ["alert has time field", typeof alert.time === "string"],
    ];

    failed = checks.some(([, ok]) => !ok);
    for (const [name, ok] of checks) {
      console.log(`[smoke] ${ok ? "PASS" : "FAIL"} ${name}`);
    }

    ws.close();
  } catch (err) {
    failed = true;
    console.error("[smoke] ERROR:", err);
  } finally {
    server.kill();
  }

  process.exit(failed ? 1 : 0);
}

main();
