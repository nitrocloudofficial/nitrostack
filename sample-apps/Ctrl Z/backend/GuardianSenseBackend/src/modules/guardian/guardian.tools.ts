import { ToolDecorator as Tool, ExecutionContext, z } from "@nitrostack/core";
import {
  sessionManager,
  deviceRegistry,
  guardianStateManager,
} from "../../api/context.js";

export class GuardianTools {
  @Tool({
    name: "get_system_status",
    description: "Returns GuardianSense backend status.",
    inputSchema: z.object({}),
  })
  async getSystemStatus(_input: unknown, ctx: ExecutionContext) {
    ctx.logger.info("System status requested");
    return guardianStateManager.getState();
  }

  @Tool({
    name: "get_connected_devices",
    description: "Returns all registered Guardian Bridge devices.",
    inputSchema: z.object({}),
  })
  async getConnectedDevices(_input: unknown, ctx: ExecutionContext) {
    ctx.logger.info("Connected devices requested");
    return deviceRegistry.getAllDevices();
  }

  @Tool({
    name: "start_monitoring",
    description: "Starts a GuardianSense monitoring session.",
    inputSchema: z.object({
      deviceId: z.string().describe("Guardian Bridge device ID"),
    }),
  })
  async startMonitoring(input: { deviceId: string }, ctx: ExecutionContext) {
    ctx.logger.info("Starting monitoring", { deviceId: input.deviceId });

    const session = sessionManager.createSession(input.deviceId);

    guardianStateManager.updateState({
      monitoringActive: true,
      activeSessions: sessionManager
        .getAllSessions()
        .filter((s) => s.monitoring).length,
    });

    return { success: true, session };
  }

  @Tool({
    name: "stop_monitoring",
    description: "Stops an active GuardianSense monitoring session.",
    inputSchema: z.object({
      sessionId: z.string().describe("Monitoring session ID"),
    }),
  })
  async stopMonitoring(input: { sessionId: string }, ctx: ExecutionContext) {
    ctx.logger.info("Stopping monitoring", { sessionId: input.sessionId });

    const success = sessionManager.stopSession(input.sessionId);

    guardianStateManager.updateState({
      monitoringActive: false,
      activeSessions: sessionManager
        .getAllSessions()
        .filter((session) => session.monitoring).length,
    });

    return { success };
  }
}
