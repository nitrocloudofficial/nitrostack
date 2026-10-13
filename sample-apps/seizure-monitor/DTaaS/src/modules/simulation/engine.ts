import * as math from "mathjs";
import { DeclarativeModel } from "./types.js";

export function runSimulation(
    model: DeclarativeModel,
    steps: number,
    dt: number,
    paramOverrides?: Record<string, number> | string
): { t: number; [key: string]: number }[] {
    let overrides = paramOverrides;
    if (typeof overrides === "string") {
        try {
            overrides = JSON.parse(overrides);
        } catch {
            overrides = undefined;
        }
    }
    const params = { ...model.params, ...((overrides as Record<string, number>) ?? {}) };

    const stepsNum = isNaN(Number(steps)) ? 24 : Number(steps);
    const dtNum = isNaN(Number(dt)) ? 1 : Number(dt);
    
    // Build initial state from stateVars using params as starting values (default 0)
    const state: Record<string, number> = {};
    for (const v of model.stateVars) {
        state[v] = params[v] ?? 0;
    }

    const history: { t: number; [key: string]: number }[] = [];
    
    // Push t=0 before the loop starts (clone to avoid mutation issues)
    history.push({ t: 0, ...state });

    for (let step = 1; step <= stepsNum; step++) {
        const t = (step - 1) * dtNum; // t at start of step
        const scope = { ...params, ...state, t, dt: dtNum };

        const nextState = { ...state };

        if (model.mode === "equations") {
            for (const v of model.stateVars) {
                if (model.equations?.[v]) {
                    nextState[v] = math.evaluate(model.equations[v], scope);
                }
            }
        } else if (model.mode === "rates") {
            for (const v of model.stateVars) {
                if (model.rates?.[v]) {
                    const rate = math.evaluate(model.rates[v], scope);
                    nextState[v] = state[v] + rate * dtNum;
                }
            }
        } else if (model.mode === "rules") {
            if (model.rules) {
                for (const rule of model.rules) {
                    const ruleScope = { ...params, ...nextState, t, dt: dtNum };
                    if (math.evaluate(rule.condition, ruleScope)) {
                        const parts = rule.effect.split("=");
                        const varName = parts[0].trim();
                        const expr = parts[1].trim();
                        nextState[varName] = math.evaluate(expr, ruleScope);
                    }
                }
            }
        }

        // Update current state for the next step
        for (const v of model.stateVars) {
            state[v] = nextState[v];
        }

        const currentT = step * dtNum;
        history.push({ t: currentT, ...state });
    }

    return history;
}
