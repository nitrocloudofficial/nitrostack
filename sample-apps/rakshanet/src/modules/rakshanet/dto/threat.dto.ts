import { RiskLevel } from "../types/risk.types.js";
import { ActionType } from "../types/action.types.js";

export interface ThreatInput {
    night: boolean;
    poorLighting: boolean;
    routeDeviation: boolean;
    audioThreat: number;

    // New fields
    latitude: number;
    longitude: number;
    guardianPhone: string;
}

export interface ThreatResult {
    risk: number;
    level: RiskLevel;
    action: ActionType;
}