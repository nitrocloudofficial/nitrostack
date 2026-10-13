import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';
import { DecisionTools } from './modules/decisions/decision.tools.js';

const geminiKey = process.env.GEMINI_API_KEY || '';
const anthropicKey = process.env.ANTHROPIC_API_KEY || '';

const ai = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;
const anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;

const decisionTools = new DecisionTools();
const mockCtx: any = {
  logger: {
    info: (msg: string, meta?: any) => {},
    error: (msg: string, meta?: any) => console.error(`[TOOL ERROR] ${msg}`, meta || ''),
    warn: (msg: string, meta?: any) => console.warn(`[TOOL WARN] ${msg}`, meta || '')
  }
};

const toolDeclarations: FunctionDeclaration[] = [
  {
    name: 'search_decisions',
    description: 'Vector similarity search over pre-extracted decision records.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Search query string' },
        top_k: { type: Type.NUMBER, description: 'Number of results to return (default 5)' }
      },
      required: ['query']
    }
  },
  {
    name: 'search_segments',
    description: 'Vector similarity search over raw transcript segments.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Search query string' },
        top_k: { type: Type.NUMBER, description: 'Number of segments to return (default 5)' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_related_decisions',
    description: 'Retrieves connected or superseding decisions from the decision graph.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        decision_id: { type: Type.STRING, description: 'ID of target decision' }
      },
      required: ['decision_id']
    }
  },
  {
    name: 'get_segment_context',
    description: 'Fetches surrounding transcript segments before and after a target segment ID.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        segment_id: { type: Type.STRING, description: 'Target segment ID' },
        window: { type: Type.NUMBER, description: 'Lines before & after to return (default 2)' }
      },
      required: ['segment_id']
    }
  },
  {
    name: 'extract_decision_from_segments',
    description: 'Analyzes raw transcript segments live to synthesize a structured decision event. Persists high-confidence decisions to DB.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        segment_ids: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of raw segment IDs' }
      },
      required: ['segment_ids']
    }
  },
  {
    name: 'verify_claim',
    description: 'Strictly verifies whether a candidate claim is supported by evidence in raw segments.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        claim: { type: Type.STRING, description: 'Statement to verify' },
        segment_ids: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Segment IDs with supporting evidence' }
      },
      required: ['claim', 'segment_ids']
    }
  },
  {
    name: 'ingest_transcript',
    description: 'Chunks transcript text, embeds passages, and inserts into source_segments.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        transcript_text: { type: Type.STRING, description: 'Full transcript text' },
        source_name: { type: Type.STRING, description: 'Source name identifier' }
      },
      required: ['transcript_text', 'source_name']
    }
  }
];

export const SYSTEM_PROMPT = `You are Decision Trail AI, an agentic decision intelligence system. Your role is to investigate questions about past architectural and project decisions strictly using grounded evidence.

AVAILABLE TOOLS:
- search_decisions(query: string, top_k?: number): Search pre-extracted decision records.
- search_segments(query: string, top_k?: number): Search raw transcript passages.
- get_related_decisions(decision_id: string): Retrieve graph connections / superseding decisions.
- get_segment_context(segment_id: string, window?: number): View surrounding conversation.
- extract_decision_from_segments(segment_ids: string[]): Extract a decision live from raw segments.
- verify_claim(claim: string, segment_ids: string[]): Validate if a claim is factually supported.

INVESTIGATION PROTOCOL:
1. DIRECT SEARCH: Query search_decisions first.
2. PIVOT ON WEAK RESULTS: If search_decisions yields empty/weak results, call search_segments to find raw passages.
3. LIVE EXTRACTION: When relevant raw segments are found without a decision, call extract_decision_from_segments.
4. GRAPH TRACING: If the question implies history, changes, or current state, call get_related_decisions on initial decision IDs to check if superseded.
5. STRICT VERIFICATION: BEFORE finalizing any answer, call verify_claim(claim, segment_ids). If verify_claim fails, drop the claim.
6. REFUSAL & DEFERRED RULE:
   - If evidence shows the topic was discussed but explicitly DEFERRED, POSTPONED, or left UNDECIDED, state that context clearly ("Note: The team discussed X but explicitly deferred the decision until..."), then output: "No recorded rationale found."
   - If after investigation no recorded rationale is found at all, state: "No recorded rationale found."
7. Max 6 tool calls total.`;

async function executeTool(name: string, args: any): Promise<any> {
  const safeArgs = args || {};
  switch (name) {
    case 'search_decisions':
      return await decisionTools.searchDecisions(safeArgs, mockCtx);
    case 'search_segments':
      return await decisionTools.searchSegments(safeArgs, mockCtx);
    case 'get_related_decisions':
      return await decisionTools.getRelatedDecisions(safeArgs, mockCtx);
    case 'get_segment_context':
      return await decisionTools.getSegmentContext(safeArgs, mockCtx);
    case 'extract_decision_from_segments':
      return await decisionTools.extractDecisionFromSegments(safeArgs, mockCtx);
    case 'verify_claim':
      return await decisionTools.verifyClaim(safeArgs, mockCtx);
    case 'ingest_transcript':
      return await decisionTools.ingestTranscript(safeArgs, mockCtx);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function runAgentOrchestration(userQuestion: string) {
  console.log(`\n===============================================================`);
  console.log(`❓ USER QUESTION: "${userQuestion}"`);
  console.log(`===============================================================`);

  let conversationHistory: any[] = [
    { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nUSER QUESTION: ${userQuestion}` }] }
  ];

  let stepCount = 0;
  const MAX_STEPS = 6;

  while (stepCount < MAX_STEPS) {
    stepCount++;

    try {
      const response = await ai!.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: conversationHistory,
        config: {
          tools: [{ functionDeclarations: toolDeclarations }]
        }
      });

      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          const toolName = call.name || '';
          console.log(`\n🔄 STEP ${stepCount}: Agent requested Tool Call -> [${toolName}]`);
          console.log(`📥 Tool Input:`, JSON.stringify(call.args || {}, null, 2));

          const toolResult = await executeTool(toolName, call.args || {});
          console.log(`📤 Tool Output:`, JSON.stringify(toolResult, null, 2));

          conversationHistory.push({
            role: 'model',
            parts: [{ functionCall: call }]
          });

          conversationHistory.push({
            role: 'user',
            parts: [{
              functionResponse: {
                name: toolName,
                response: { result: toolResult }
              }
            }]
          });
        }
      } else {
        const finalAnswer = response.text || '';
        console.log(`\n🏁 FINAL AGENT ANSWER (Step ${stepCount}):`);
        console.log(`---------------------------------------------------------------`);
        console.log(finalAnswer);
        console.log(`---------------------------------------------------------------\n`);
        return finalAnswer;
      }
    } catch (e: any) {
      if (e?.status === 429) {
        console.warn('⚠️ Rate limit hit. Pausing for 5 seconds before retry...');
        await delay(5000);
        stepCount--;
        continue;
      }
      throw e;
    }
  }

  console.log(`\n⚠️ Agent reached tool call limit (${MAX_STEPS} steps).`);
}
