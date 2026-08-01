import { ActionType } from "../types/action.types.js";
import { RiskLevel } from "../types/risk.types.js";

export interface DecisionResult {
    level: RiskLevel;
    action: ActionType;
    verifyUser: boolean;
    notifyGuardian: boolean;
    sendSMS: boolean;
    triggerFakeCall: boolean;
}