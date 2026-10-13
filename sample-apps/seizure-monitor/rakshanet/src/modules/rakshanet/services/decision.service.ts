import { Injectable } from "@nitrostack/core";

import { RiskLevel } from "../types/risk.types.js";
import { ActionType } from "../types/action.types.js";
import { DecisionResult } from "../dto/decision.dto.js";

@Injectable()
export class DecisionService {

    decide(level: RiskLevel): DecisionResult {

        switch (level) {

            case RiskLevel.CRITICAL:
                return {
                    level,
                    action: ActionType.EMERGENCY,
                    verifyUser: true,
                    notifyGuardian: true,
                    sendSMS: true,
                    triggerFakeCall: true,
                };

            case RiskLevel.HIGH:
                return {
                    level,
                    action: ActionType.ALERT,
                    verifyUser: true,
                    notifyGuardian: false,
                    sendSMS: false,
                    triggerFakeCall: false,
                };

            case RiskLevel.MEDIUM:
                return {
                    level,
                    action: ActionType.MONITOR,
                    verifyUser: false,
                    notifyGuardian: false,
                    sendSMS: false,
                    triggerFakeCall: false,
                };

            default:
                return {
                    level,
                    action: ActionType.NONE,
                    verifyUser: false,
                    notifyGuardian: false,
                    sendSMS: false,
                    triggerFakeCall: false,
                };
        }
    }
}