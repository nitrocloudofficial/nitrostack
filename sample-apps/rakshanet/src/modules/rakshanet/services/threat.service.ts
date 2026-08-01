import { Injectable } from "@nitrostack/core";

import { ThreatInput, ThreatResult } from "../dto/threat.dto.js";
import { RiskLevel } from "../types/risk.types.js";
import { ActionType } from "../types/action.types.js";

@Injectable()
export class ThreatService {

    assessThreat(input: ThreatInput): ThreatResult {

        let risk = 0;

        if (input.night) risk += 20;
        if (input.poorLighting) risk += 20;
        if (input.routeDeviation) risk += 30;

        risk += Math.min(input.audioThreat, 30);

        let level = RiskLevel.LOW;
        let action = ActionType.NONE;

        if (risk >= 70) {
            level = RiskLevel.CRITICAL;
            action = ActionType.VERIFY_USER;
        } else if (risk >= 50) {
            level = RiskLevel.HIGH;
            action = ActionType.ALERT;
        } else if (risk >= 30) {
            level = RiskLevel.MEDIUM;
            action = ActionType.MONITOR;
        }

        return {
            risk,
            level,
            action,
        };
    }

}