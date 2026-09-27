import { DeviceRegistry } from "./device-registry.js";
import { SessionManager } from "./session-manager.js";
import { GuardianStateManager } from "./guardian-state-manager.js";
import { GuardianAI, GuardianAnalysis } from "./guardian-ai.js";
import { updateLiveVitals } from "./live-state.js";
import { updateMonitorState } from "./monitor-state.js";
import { Severity, updateAlert } from "./alert-state.js";
import { packetRateTracker } from "./packet-rate-tracker.js";
import { pushCsiSample } from "./csi-ring-buffer.js";

export interface GuardianBridgeMessage {
  deviceId: string;
  timestamp: string;
  rawPacket: any;
}

export interface LiveEventBroadcaster {
  broadcast(data: unknown): void;
}

const RISK_TO_SEVERITY: Record<string, Severity> = {
  High: "high",
  Medium: "medium",
  Low: "medium",
  Safe: "low",
};

function analysisToSeverity(analysis: GuardianAnalysis): Severity {
  const severity = RISK_TO_SEVERITY[analysis.risk];
  if (severity) {
    return severity;
  }
  return analysis.movementDetected ? "medium" : "low";
}

export class GuardianCore {
  private guardianAI = new GuardianAI();

  constructor(
    private deviceRegistry: DeviceRegistry,
    private sessionManager: SessionManager,
    private stateManager: GuardianStateManager,
    private broadcaster: LiveEventBroadcaster
  ) {}

  processBridgeMessage(message: GuardianBridgeMessage) {
    const analysis = this.guardianAI.analyze(message.rawPacket);
    const packetRate = packetRateTracker.record();
    const csi: number[] = message.rawPacket?.csi ?? [];

    pushCsiSample(csi);

    const severity = analysisToSeverity(analysis);
    if (analysis.risk === "High" || analysis.movementDetected) {
      updateAlert({
        active: true,
        title: analysis.risk === "High" ? "High Risk Detected" : "Movement Detected",
        message:
          analysis.risk === "High"
            ? "Respiration is outside the safe range."
            : "Motion detected; monitoring elevated activity.",
        severity,
        time: new Date().toLocaleTimeString(),
      });
    } else {
      updateAlert({
        active: false,
        title: "",
        message: "",
        severity,
        time: "",
      });
    }

    updateLiveVitals({
      respiration: analysis.respiration,
      motion: analysis.motion,
      confidence: analysis.confidence,
      risk: analysis.risk,
      csi,
    });

    updateMonitorState({
      packetRate,
      rssi: message.rawPacket.rssi ?? -90,
      activity: analysis.motion,
      respiration: analysis.respiration,
      confidence: analysis.confidence,
    });

    this.broadcaster.broadcast({
      event: "LIVE_UPDATE",
      data: {
        ...analysis,
        csi,
        packetRate,
        rssi: message.rawPacket.rssi,
      },
    });

    this.deviceRegistry.updateHeartbeat(message.deviceId);

    this.stateManager.updateState({
      connectedDevices: this.deviceRegistry.getAllDevices().length,
      activeSessions: this.sessionManager
        .getAllSessions()
        .filter((session) => session.monitoring).length,
    });

    return {
      processed: true,
      deviceId: message.deviceId,
      analysis,
      packetRate,
    };
  }
}
