import { SessionManager } from "../services/session-manager.js";
import { DeviceRegistry } from "../services/device-registry.js";
import { GuardianStateManager } from "../services/guardian-state-manager.js";
import { GuardianCore } from "../services/guardian-core.js";
import { GuardianWebSocketServer } from "../websocket/websocket-server.js";

export const sessionManager = new SessionManager();
export const deviceRegistry = new DeviceRegistry();
export const guardianStateManager = new GuardianStateManager();

export const websocketServer = new GuardianWebSocketServer(8080);

export const guardianCore = new GuardianCore(
    deviceRegistry,
    sessionManager,
    guardianStateManager,
    websocketServer
);