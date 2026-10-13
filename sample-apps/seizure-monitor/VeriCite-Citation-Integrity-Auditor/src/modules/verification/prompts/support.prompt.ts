/**
 * VeriCite – Verification Engine
 * prompts/support.prompt.ts — LLM prompt builder for claim-support verification
 */

/**
 * Builds the system prompt that instructs the LLM to act as a citation
 * integrity analyst and return strict JSON.
 */
export function buildSystemPrompt(): string {
  return `You are a rigorous academic citation integrity analyst.
Your task is to determine whether a cited paper's abstract supports, contradicts, or is insufficient to evaluate a specific scientific claim.

You MUST respond with ONLY a valid JSON object — no markdown fences, no explanation outside the JSON.

Response schema:
{
  "status": "SUPPORTED" | "CONTRADICTED" | "NOT_ENOUGH_EVIDENCE",
  "confidence": <number between 0.0 and 1.0>,
  "reason": "<one clear sentence explaining the verdict>"
}

Definitions:
- SUPPORTED: The abstract explicitly or strongly implicitly supports the claim.
- CONTRADICTED: The abstract explicitly or strongly implicitly contradicts the claim.
- NOT_ENOUGH_EVIDENCE: The abstract does not contain sufficient information to evaluate the claim.

Rules:
- Base your decision ONLY on the provided abstract text.
- If the abstract is empty or unavailable, return NOT_ENOUGH_EVIDENCE with confidence 0.0.
- confidence must reflect how certain you are: 1.0 = fully certain, 0.0 = completely uncertain.
- reason must be a single sentence, factual, and reference specific content from the abstract when possible.
- Do NOT hallucinate. Do NOT infer information not present in the abstract.`;
}

/**
 * Builds the user-turn message containing the claim and abstract to evaluate.
 */
export function buildUserPrompt(claim: string, abstract: string): string {
  const abstractText = abstract.trim()
    ? abstract.trim()
    : "[Abstract not available]";

  return `Claim to evaluate:
"${claim}"

Abstract of cited paper:
"""
${abstractText}
"""

Evaluate whether the abstract supports, contradicts, or provides insufficient evidence for the claim.
Respond with ONLY the JSON object described in the system prompt.`;
}
