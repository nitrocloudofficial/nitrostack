/**
 * VeriCite – Verification Engine
 * services/support-verifier.service.ts
 *
 * Uses the Groq LLM API to determine whether a paper's abstract supports,
 * contradicts, or provides insufficient evidence for a given claim.
 *
 * Requires: GROQ_API_KEY environment variable.
 */

import { z } from "zod";
import axios from "axios";
import { createLogger } from "../utils/logger.js";
import { withRetry, isAxiosRetryable } from "../utils/retry.js";
import { buildSystemPrompt, buildUserPrompt } from "../prompts/support.prompt.js";
import type { SupportVerificationResult } from "../types.js";
import type { VerificationStatus } from "../types.js";

const logger = createLogger("support-verifier");

// ── Constants ─────────────────────────────────────────────────────────────

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * The Groq model to use. llama-3.3-70b-versatile is a strong
 * reasoning model available on the Groq free tier.
 */
const GROQ_MODEL = "llama-3.3-70b-versatile";

const VALID_STATUSES = new Set<VerificationStatus>([
  "SUPPORTED",
  "CONTRADICTED",
  "NOT_ENOUGH_EVIDENCE",
  "UNRELATED",
  "ERROR",
]);

// ── Zod schema for LLM response ───────────────────────────────────────────

const LLMResponseSchema = z.object({
  status: z.enum(["SUPPORTED", "CONTRADICTED", "NOT_ENOUGH_EVIDENCE"]),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
});

// ── Groq API response schema ──────────────────────────────────────────────

const GroqChatResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    })
  ),
});

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Strips optional markdown code fences around JSON responses
 * in case the model emits ```json ... ``` despite being told not to.
 */
function stripCodeFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function fallbackResult(reason: string): SupportVerificationResult {
  return {
    status: "NOT_ENOUGH_EVIDENCE",
    confidence: 0,
    reason,
  };
}

// ── Public service class ──────────────────────────────────────────────────

export class SupportVerifierService {
  /**
   * Stored at construction time. May be null if GROQ_API_KEY is not set.
   * Validated lazily in verifySupportClaim() so the constructor never throws.
   */
  private readonly apiKey: string | null;

  constructor() {
    // Do NOT throw here. A missing key degrades only the LLM support step;
    // the three academic API lookups must still succeed.
    this.apiKey = process.env["GROQ_API_KEY"] ?? null;
  }

  /**
   * Evaluates whether `abstract` supports, contradicts, or provides
   * insufficient evidence for `claim`.
   *
   * Returns a SupportVerificationResult.
   * Never throws — returns NOT_ENOUGH_EVIDENCE on any failure.
   */
  async verifySupportClaim(
    claim: string,
    abstract: string | null
  ): Promise<SupportVerificationResult> {
    // Validate the API key lazily so a missing key never crashes the constructor
    // or the parallel API-lookup phase that precedes this call.
    if (!this.apiKey) {
      logger.warn(
        "Support verifier: GROQ_API_KEY is not set — skipping LLM support check. " +
          "Obtain a free key at https://console.groq.com"
      );
      return fallbackResult(
        "GROQ_API_KEY is not configured; claim support could not be verified."
      );
    }

    const abstractText = abstract?.trim() ?? "";

    if (!abstractText) {
      logger.warn("Support verifier: no abstract available — skipping LLM call");
      return fallbackResult(
        "Abstract was not available; cannot determine if the claim is supported."
      );
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(claim, abstractText);

    try {
      const rawContent = await withRetry(
        () => this.callGroq(systemPrompt, userPrompt),
        { maxAttempts: 3, isRetryable: isAxiosRetryable }
      );

      return this.parseResponse(rawContent);
    } catch (err) {
      logger.error("Support verifier: LLM call failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return fallbackResult(
        "LLM support verification failed due to an API error."
      );
    }
  }

  // ── Private methods ─────────────────────────────────────────────────────

  private async callGroq(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    // this.apiKey is guaranteed non-null here: verifySupportClaim() validates
    // it and returns early before ever calling callGroq().
    const apiKey = this.apiKey as string;

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,       // Low temperature for deterministic reasoning
        max_tokens: 512,
        response_format: { type: "json_object" },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30_000,
      }
    );

    const parsed = GroqChatResponseSchema.safeParse(response.data);
    if (!parsed.success || !parsed.data.choices[0]?.message?.content) {
      throw new Error("Groq returned an unexpected response shape");
    }

    return parsed.data.choices[0].message.content;
  }

  private parseResponse(rawContent: string): SupportVerificationResult {
    const cleaned = stripCodeFences(rawContent);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      logger.error("Support verifier: failed to parse LLM JSON", { raw: cleaned });
      return fallbackResult("LLM returned non-JSON output; cannot determine support status.");
    }

    const validated = LLMResponseSchema.safeParse(parsed);
    if (!validated.success) {
      logger.warn("Support verifier: LLM response failed schema validation", {
        errors: validated.error.format(),
        raw: cleaned,
      });

      // Attempt a best-effort extraction from the raw parsed object
      const anyParsed = parsed as Record<string, unknown>;
      const rawStatus = String(anyParsed["status"] ?? "").toUpperCase() as VerificationStatus;
      if (VALID_STATUSES.has(rawStatus)) {
        return {
          status: rawStatus,
          confidence: typeof anyParsed["confidence"] === "number"
            ? Math.min(1, Math.max(0, anyParsed["confidence"]))
            : 0,
          reason: typeof anyParsed["reason"] === "string"
            ? anyParsed["reason"]
            : "Reason not provided.",
        };
      }

      return fallbackResult("LLM response did not match expected schema.");
    }

    logger.info("Support verifier result", { status: validated.data.status });
    return validated.data;
  }
}
