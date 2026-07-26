// src/visualization/visual-mapping-agent.service.ts
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from "@nitrostack/core";
const SYSTEM_PROMPT = `You are a 3D visualization designer for a digital twin platform. Given a device type and its telemetry schema, design a CompositeShape made of 3-6 simple geometric parts that reasonably represents this real-world device, then map telemetry metrics onto specific parts' visual properties.

Output ONLY a JSON object matching this schema — no prose, no markdown fences:
{
  "deviceType": string,
  "shape": { "deviceType": string, "parts": [
    { "role": string, "geometry": "cylinder"|"box"|"sphere"|"cone"|"torus",
      "dimensions": number[], "position": [number,number,number],
      "rotation": [number,number,number] | null, "color": string } ] },
  "mappings": [
    { "metric": string, "targetRole": string, "property": "color"|"rotationSpeed"|"scaleY"|"opacity",
      "range": {"min": number, "max": number},
      "outputRange": {"min": number, "max": number} | {"colorLow": string, "colorHigh": string} } ]
}

RULES:
1. Position parts relative to each other sensibly; keep the whole assembly within a ~2x2x2 unit box.
2. dimensions must match Three.js constructor order: 
   cylinder [radiusTop,radiusBottom,height,radialSegments], box [width,height,depth], 
   sphere [radius,widthSegments,heightSegments], cone [radius,height,radialSegments], 
   torus [radius,tube,radialSegments,tubularSegments].
3. Every "metric" must exist in the provided telemetry schema; use its expectedRange as "range".
4. Every "targetRole" must match a "role" of one of the parts defined in shape.parts.
5. rotationSpeed → rotating parts (fans/shafts/impellers); color → temperature/health-like 
   metrics; scaleY → level/fill-like metrics; opacity → status/alarm-like metrics.
6. Colors must be valid 6-digit hex strings (e.g. "#4a90d9").`;
let VisualMappingAgentService = class VisualMappingAgentService {
    async generateVisualMapping(deviceType, telemetrySchema) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY environment variable is not defined.");
        }
        const metricsFormatted = telemetrySchema.metrics.map(m => ({
            name: m.name,
            unit: m.unit,
            expectedRange: m.expectedRange
        }));
        const userMessage = `Device Type: ${deviceType}\nTelemetry Schema Metrics:\n${JSON.stringify(metricsFormatted, null, 2)}`;
        let modelName = "gemini-2.5-flash";
        let response = await this.callGemini(modelName, apiKey, userMessage);
        if (response.status === 404 || response.status === 429) {
            modelName = "gemini-3.5-flash";
            response = await this.callGemini(modelName, apiKey, userMessage);
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
            throw new Error(`Failed to parse VisualMapping response JSON: ${err.message}. Response was: ${cleanText}`);
        }
        // Verify required top level fields
        if (!parsed.deviceType || !parsed.shape || !parsed.mappings) {
            throw new Error("Invalid VisualMapping response: missing required top-level fields (deviceType, shape, or mappings)");
        }
        if (!parsed.shape.parts || !Array.isArray(parsed.shape.parts)) {
            throw new Error("Invalid VisualMapping response: shape.parts must be an array");
        }
        if (!Array.isArray(parsed.mappings)) {
            throw new Error("Invalid VisualMapping response: mappings must be an array");
        }
        return parsed;
    }
    async callGemini(modelName, apiKey, message) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const requestBody = {
            systemInstruction: {
                parts: [{ text: SYSTEM_PROMPT }]
            },
            contents: [{
                    parts: [{ text: message }]
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
};
VisualMappingAgentService = __decorate([
    Injectable()
], VisualMappingAgentService);
export { VisualMappingAgentService };
//# sourceMappingURL=visual-mapping-agent.service.js.map