var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from "@nitrostack/core";
const MODEL_BUILDER_SYSTEM_PROMPT = `You are a simulation model designer for a digital twin platform. Your job is to translate a plain-language simulation requirement into a STRUCTURED DATA specification — never executable code, never a function, never a script.

Output ONLY a single JSON object matching this exact schema. No prose, no markdown code fences, no explanation outside the JSON.

{
  "id": string,
  "domain": string,
  "mode": "equations" | "rates" | "rules",
  "stateVars": string[],
  "params": { [name: string]: number },
  "equations": { [stateVar: string]: string } | null,
  "rates": { [stateVar: string]: string } | null,
  "rules": [{ "condition": string, "effect": string }] | null,
  "knownFormulaReference": string | null,
  "assumptions": string[],
  "confidence": "high" | "medium" | "low",
  "requiresExpertReview": boolean
}

RULES YOU MUST FOLLOW:

1. Every expression in "equations", "rates", or "rules" must be a pure mathematical expression — usable by a standard math expression evaluator (supports +, -, *, /, ^, comparisons, ternary ?:, common functions like exp, log, sqrt, min, max, random). NEVER include loops, function definitions, imports, or any programming construct.

2. Every variable used inside an expression MUST be one of: a name listed in "stateVars", a name listed in "params", or the reserved names "t" (elapsed simulation time) and "dt" (tick size). Do not reference undefined variables.

3. Prefer well-established, named formulas from the relevant field (physics, pharmacokinetics, electrical engineering, queueing theory, etc.) over inventing new ones. Always fill in "knownFormulaReference" when you use one.

4. If the requirement doesn't map cleanly to a known formula, say so honestly: lower "confidence", explain the gap in "assumptions", and set "requiresExpertReview": true.

5. Set "requiresExpertReview": true whenever the domain is medical, pharmaceutical, structural/safety engineering, legal, or financial — regardless of your confidence level.

6. Choose "mode" based on the nature of the system:
   - "equations": use when the state at time t has a direct closed-form formula
   - "rates": use when you know how fast something changes (a derivative) but not a closed-form solution — this covers most physical/biological systems
   - "rules": use for conditional/threshold-driven or state-machine-like behavior (queues, business processes, on/off logic)

7. Never include commentary, disclaimers, or text outside the JSON object itself.

8. For every state variable listed in "stateVars", you MUST define a reasonable default initial value inside the "params" object (for example, if "stateVars" has "R", include a starting value like "R": 100 in "params").`;
let ModelBuilderAgentService = class ModelBuilderAgentService {
    async generateModel(requirement, domain) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY environment variable is not defined.");
        }
        let modelName = "gemini-2.5-flash";
        let response = await this.callGemini(modelName, apiKey, requirement, domain);
        // Fallback if the model is no longer available/supported (e.g. returns 404)
        if (response.status === 404) {
            modelName = "gemini-3.5-flash";
            response = await this.callGemini(modelName, apiKey, requirement, domain);
        }
        if (!response.ok) {
            const errorText = await response.text().catch(() => "Unknown error");
            throw new Error(`Gemini API returned status ${response.status} for model ${modelName}: ${errorText}`);
        }
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            throw new Error(`Invalid response format from Gemini API using model ${modelName} (missing candidate text).`);
        }
        // Clean up markdown block format just in case
        let cleanText = text.trim();
        if (cleanText.startsWith("```")) {
            cleanText = cleanText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        }
        // Extract the JSON object substring to handle trailing extra characters/braces
        const firstBrace = cleanText.indexOf("{");
        const lastBrace = cleanText.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }
        let parsed;
        try {
            parsed = JSON.parse(cleanText);
        }
        catch (err) {
            throw new Error(`Failed to parse response JSON: ${err.message}. Response was: ${cleanText}`);
        }
        // Validate the structure matches DeclarativeModel
        this.validateSchema(parsed);
        return parsed;
    }
    async callGemini(modelName, apiKey, requirement, domain) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const requestBody = {
            systemInstruction: {
                parts: [{ text: MODEL_BUILDER_SYSTEM_PROMPT }]
            },
            contents: [{
                    parts: [{ text: `Domain hint: ${domain ?? "unspecified"}\nRequirement: ${requirement}` }]
                }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2
            }
        };
        return fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });
    }
    validateSchema(model) {
        if (typeof model !== "object" || model === null) {
            throw new Error("Model is not a valid JSON object.");
        }
        const requiredStringFields = ["domain", "confidence"];
        for (const field of requiredStringFields) {
            if (typeof model[field] !== "string" || !model[field]) {
                throw new Error(`Missing or invalid required string field: "${field}"`);
            }
        }
        if (model.mode !== "equations" && model.mode !== "rates" && model.mode !== "rules") {
            throw new Error(`Invalid mode: "${model.mode}". Must be equations, rates, or rules.`);
        }
        if (!Array.isArray(model.stateVars)) {
            throw new Error("Missing or invalid stateVars (must be an array of strings).");
        }
        for (const sv of model.stateVars) {
            if (typeof sv !== "string") {
                throw new Error("Each stateVar must be a string.");
            }
        }
        if (typeof model.params !== "object" || model.params === null) {
            throw new Error("Missing or invalid params (must be an object mapping names to numbers).");
        }
        for (const k of Object.keys(model.params)) {
            if (typeof model.params[k] !== "number") {
                throw new Error(`Parameter value for "${k}" must be a number.`);
            }
        }
        if (model.mode === "equations") {
            if (typeof model.equations !== "object" || model.equations === null) {
                throw new Error("equations must be an object when mode is 'equations'.");
            }
        }
        else if (model.mode === "rates") {
            if (typeof model.rates !== "object" || model.rates === null) {
                throw new Error("rates must be an object when mode is 'rates'.");
            }
        }
        else if (model.mode === "rules") {
            if (!Array.isArray(model.rules)) {
                throw new Error("rules must be an array when mode is 'rules'.");
            }
            for (const rule of model.rules) {
                if (typeof rule !== "object" || rule === null || typeof rule.condition !== "string" || typeof rule.effect !== "string") {
                    throw new Error("Each rule must contain condition and effect strings.");
                }
            }
        }
        if (model.knownFormulaReference !== null && typeof model.knownFormulaReference !== "string") {
            throw new Error("knownFormulaReference must be a string or null.");
        }
        if (!Array.isArray(model.assumptions)) {
            throw new Error("assumptions must be an array of strings.");
        }
        if (typeof model.requiresExpertReview !== "boolean") {
            throw new Error("requiresExpertReview must be a boolean.");
        }
    }
};
ModelBuilderAgentService = __decorate([
    Injectable()
], ModelBuilderAgentService);
export { ModelBuilderAgentService };
//# sourceMappingURL=model-builder-agent.service.js.map