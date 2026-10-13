import { loadMcpEnvironment } from '../config/environment.js';

export interface GroundedLlmRequest {
  purpose: 'WORKFLOW_PLANNING' | 'RESEARCH_CHAT';
  prompt: string;
  evidence: Record<string, string>;
}

export interface GroundedLlmResult {
  used: boolean;
  text: string | null;
  warning: string | null;
}

export async function generateGroundedLlmText(
  request: GroundedLlmRequest,
): Promise<GroundedLlmResult> {
  const environment = loadMcpEnvironment();
  if (!environment.LLM_ENABLED || environment.OPENAI_API_KEY === undefined) {
    return {
      used: false,
      text: null,
      warning: 'llm-provider-not-configured',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), environment.LLM_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${environment.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: environment.LLM_MODEL,
        store: false,
        instructions: [
          'You are the ImmunoGraph research assistant.',
          'Use only the supplied evidence.',
          'Do not invent biological predictions, docking results, structure facts, or compound facts.',
          'If the evidence is insufficient, say so clearly.',
          'Keep the answer concise and label limitations.',
        ].join(' '),
        input: buildInput(request),
        max_output_tokens: 300,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        used: false,
        text: null,
        warning: `llm-provider-http-${response.status}`,
      };
    }
    const payload = (await response.json()) as unknown;
    const text = extractOutputText(payload);
    if (text === null || text.trim().length === 0) {
      return {
        used: false,
        text: null,
        warning: 'llm-provider-empty-output',
      };
    }
    return {
      used: true,
      text: text.trim(),
      warning: null,
    };
  } catch (error) {
    return {
      used: false,
      text: null,
      warning:
        error instanceof Error && error.name === 'AbortError'
          ? 'llm-provider-timeout'
          : 'llm-provider-failed',
    };
  } finally {
    clearTimeout(timer);
  }
}

function buildInput(request: GroundedLlmRequest): string {
  return JSON.stringify(
    {
      purpose: request.purpose,
      prompt: request.prompt,
      evidence: request.evidence,
      requiredBehavior: {
        groundedOnly: true,
        scientificValueGenerationAllowed: false,
        citeEvidenceKeys: true,
      },
    },
    null,
    2,
  );
}

function extractOutputText(payload: unknown): string | null {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'output_text' in payload &&
    typeof payload.output_text === 'string'
  ) {
    return payload.output_text;
  }
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'output' in payload &&
    Array.isArray(payload.output)
  ) {
    const parts: string[] = [];
    for (const item of payload.output) {
      if (
        typeof item === 'object' &&
        item !== null &&
        'content' in item &&
        Array.isArray(item.content)
      ) {
        for (const content of item.content) {
          if (
            typeof content === 'object' &&
            content !== null &&
            'text' in content &&
            typeof content.text === 'string'
          ) {
            parts.push(content.text);
          }
        }
      }
    }
    return parts.length > 0 ? parts.join('\n') : null;
  }
  return null;
}
