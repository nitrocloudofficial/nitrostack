import * as math from "mathjs";
import { DeclarativeModel } from "./types.js";

export function validateModel(model: DeclarativeModel): void {
    const allowedNames = new Set([
        ...model.stateVars,
        ...Object.keys(model.params),
        "t",
        "dt"
    ]);

    const checkExpression = (expr: string, contextName: string) => {
        let node: math.MathNode;
        try {
            node = math.parse(expr);
        } catch (err: any) {
            throw new Error(`Syntax error in ${contextName} expression "${expr}": ${err.message}`);
        }

        const symbols = node.filter((n: any) => n.isSymbolNode) as any[];
        for (const s of symbols) {
            const name = s.name;
            // Check if symbol is an allowed variable or a standard mathjs function/constant
            const isAllowed = allowedNames.has(name) || (name in math);
            if (!isAllowed) {
                throw new Error(`Undefined variable or function "${name}" in ${contextName} expression "${expr}"`);
            }
        }
    };

    if (model.mode === "equations") {
        if (!model.equations) {
            throw new Error("Missing equations object for mode 'equations'");
        }
        for (const [v, expr] of Object.entries(model.equations)) {
            if (!model.stateVars.includes(v)) {
                throw new Error(`Equation defined for non-state variable "${v}"`);
            }
            checkExpression(expr, `equations.${v}`);
        }
    } else if (model.mode === "rates") {
        if (!model.rates) {
            throw new Error("Missing rates object for mode 'rates'");
        }
        for (const [v, expr] of Object.entries(model.rates)) {
            if (!model.stateVars.includes(v)) {
                throw new Error(`Rate defined for non-state variable "${v}"`);
            }
            checkExpression(expr, `rates.${v}`);
        }
    } else if (model.mode === "rules") {
        if (!model.rules || !Array.isArray(model.rules)) {
            throw new Error("Missing or invalid rules array for mode 'rules'");
        }
        model.rules.forEach((rule, idx) => {
            checkExpression(rule.condition, `rules[${idx}].condition`);

            const parts = rule.effect.split("=");
            if (parts.length !== 2) {
                throw new Error(`Invalid rule effect format in rules[${idx}]: "${rule.effect}". Must be in 'varName = expression' format.`);
            }
            const varName = parts[0].trim();
            const expr = parts[1].trim();

            if (!model.stateVars.includes(varName)) {
                throw new Error(`Rule effect in rules[${idx}] attempts to assign to non-state variable "${varName}"`);
            }
            checkExpression(expr, `rules[${idx}].effect`);
        });
    }
}
