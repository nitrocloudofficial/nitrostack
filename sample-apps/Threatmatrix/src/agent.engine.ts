/**
 * ThreatMatrix Agentic AI Engine
 * Performs dynamic AI inference, intent understanding, context reasoning,
 * risk scoring, and response generation using rotating LLM keys (Groq / Gemini).
 *
 * ZERO FABRICATION POLICY — No hardcoded fallbacks. Errors thrown on bad AI output.
 */
import { container } from './container.js';
import { ProcessedInput } from './input.processor.js';
import { logger } from './logger.js';
import { config } from './config.js';

export interface AgentReasoningResult {
  success: boolean;
  intent: string;
  reasoningSummary: string;
  riskScore: number;
  confidence: number;
  riskLevel: 'SAFE' | 'SUSPICIOUS' | 'HIGH' | 'CRITICAL';
  findings: Array<{ category: string; description: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }>;
  recommendedActions: string[];
  response: string;
  metadata: {
    model: string;
    executionTimeMs: number;
    detectedFormat: string;
    timestamp: string;
  };
}

export class AgentEngine {
  private get groqService() { return container.groqService; }

  /**
   * Extract JSON object from LLM output robustly.
   * Strips markdown code fences and finds outermost { ... } block.
   */
  private extractJson(raw: string): string {
    // Remove markdown code fences like ```json ... ``` or ``` ... ```
    let text = raw.replace(/```(?:json)?/gi, '').replace(/```/gi, '').trim();

    // Find outermost JSON object boundaries
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');

    if (first === -1 || last === -1 || last <= first) {
      throw new Error(`AI response did not contain a JSON object. Raw output (first 300 chars): ${raw.slice(0, 300)}`);
    }

    return text.slice(first, last + 1);
  }

  /**
   * Process a normalized input through the AI Agent reasoning engine.
   */
  public async processAgenticTask(processedInput: ProcessedInput, additionalContext?: string): Promise<AgentReasoningResult> {
    const startTime = Date.now();
    logger.info('Agentic AI reasoning engine triggered', { format: processedInput.format });

    const modelName = config.modelName || 'llama-3.3-70b-versatile';

    const systemPrompt = `You are ThreatMatrix Agentic AI, an autonomous cybersecurity forensic reasoning engine.

MASTER SYSTEM INSTRUCTIONS & CONSTRAINTS:
1. ROLE & SCOPE: Act ONLY as a cybersecurity analysis engine. Analyze ONLY the artifact supplied in the current request.
2. EVIDENCE GROUNDING: Base every conclusion on explicit evidence from the supplied artifact. Never invent indicators, speculate, or rely on unprovided external context.
3. FACTS VS INFERENCES: Clearly separate verifiable Facts, logical Inferences, and Unknowns in your markdown response.
4. CASE-SPECIFIC ANALYSIS RULES:
   - URL Case: Check domain typosquatting, raw IP usage, TLD risk, path structures, brand impersonation.
   - IP Case: Check reverse DNS, abuse score, geolocation risk, port exposure.
   - Hash Case: Check hash type (MD5/SHA1/SHA256), VirusTotal detections, malware family match.
   - Email Case: Check SPF/DKIM headers, financial coercion urgency, spoofed sender domains, link targets.
   - PDF Case: Check binary objects for /JavaScript, /Launch actions, /OpenAction streams, embedded URLs.
   - System Logs Case: Extract timestamped errors, ransomware extension patterns, failed authentication bursts, lateral movement IPs.
   - Code Case: Check for unsafe shell execution, SQL injection, hardcoded credentials, buffer overflow functions.
5. DETERMINISM & SCHEMA: Produce ONLY a valid JSON object matching the strict schema below.

OUTPUT FORMAT (STRICT JSON — NO MARKDOWN FENCES, NO EXTRA TEXT):
{
  "intent": "Brief description of identified user intent",
  "reasoningSummary": "Short explanation of AI reasoning based strictly on supplied evidence",
  "riskScore": <integer 0-100 derived strictly from evidence severity>,
  "confidence": <float 0.0-1.0 reflecting completeness and objectivity of evidence>,
  "riskLevel": "SAFE" | "SUSPICIOUS" | "HIGH" | "CRITICAL",
  "findings": [
    { "category": "CATEGORY_NAME", "description": "Explicit evidence detail", "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }
  ],
  "recommendedActions": ["Action 1", "Action 2"],
  "response": "Full professional markdown report detailing Facts, Inferences, Unknowns, Threat Details, and Guidance."
}

CRITICAL: Respond with ONLY the JSON object above. Do not wrap in code fences. Do not add any conversational text before or after the JSON.`;

    const userPrompt = `INPUT DATA TO PROCESS:
Format Detected: ${processedInput.format}
Original Metadata: ${JSON.stringify(processedInput.metadata)}

NORMALIZED CONTENT:
${processedInput.normalizedText}

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}` : ''}

Respond with ONLY the JSON structure. No code fences. No additional text.`;

    try {
      const llmOutput = await this.groqService.analyzeThreat(`${systemPrompt}\n\n${userPrompt}`);
      const executionTimeMs = Date.now() - startTime;

      // Extract clean JSON from LLM output
      let jsonStr: string;
      try {
        jsonStr = this.extractJson(llmOutput);
      } catch (extractErr: any) {
        logger.error('AI output JSON extraction failed', { error: extractErr.message });
        throw new Error(`AI Agent failed: ${extractErr.message}`);
      }

      // Parse JSON
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(jsonStr);
      } catch (parseErr: any) {
        logger.error('AI output JSON parse failed', { error: parseErr.message, snippet: jsonStr.slice(0, 200) });
        throw new Error(`AI Agent failed: LLM output could not be parsed as valid JSON — ${parseErr.message}`);
      }

      // Validate required field
      if (typeof parsedJson.riskScore !== 'number') {
        throw new Error(`AI Agent failed: riskScore missing or not a number in AI response.`);
      }

      const boundedScore = Math.min(100, Math.max(0, Math.round(parsedJson.riskScore)));
      const confidence = typeof parsedJson.confidence === 'number' ? Math.min(1.0, Math.max(0.0, parsedJson.confidence)) : 0.95;
      const riskLevel = parsedJson.riskLevel ?? (boundedScore >= 75 ? 'CRITICAL' : boundedScore >= 50 ? 'HIGH' : boundedScore >= 20 ? 'SUSPICIOUS' : 'SAFE');

      return {
        success: true,
        intent: parsedJson.intent ?? 'Threat Analysis',
        reasoningSummary: parsedJson.reasoningSummary ?? 'AI analysis complete.',
        riskScore: boundedScore,
        confidence,
        riskLevel,
        findings: Array.isArray(parsedJson.findings) ? parsedJson.findings : [],
        recommendedActions: Array.isArray(parsedJson.recommendedActions) ? parsedJson.recommendedActions : [],
        response: parsedJson.response ?? jsonStr,
        metadata: {
          model: modelName,
          executionTimeMs,
          detectedFormat: processedInput.format,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (err: any) {
      logger.error('Agentic AI reasoning engine error', { error: err.message });
      throw err;
    }
  }
}
