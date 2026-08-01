import test from 'node:test'; import assert from 'node:assert/strict';
const { AiService } = await import('../dist/services/ai.service.js');
const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; delete process.env.FACTORYBRAIN_AI_BASE_URL; delete process.env.FACTORYBRAIN_AI_MODEL; delete process.env.FACTORYBRAIN_AI_MODEL_FAILURE_ANALYSIS; });

test('selects task models and exposes versioned prompts', () => {
  process.env.FACTORYBRAIN_AI_MODEL = 'default-model'; process.env.FACTORYBRAIN_AI_MODEL_FAILURE_ANALYSIS = 'failure-model';
  const ai = new AiService(); assert.equal(ai.selectModel('failure_analysis'), 'failure-model'); assert.equal(ai.selectModel('manager_summary'), 'default-model');
  assert.equal(ai.getPromptVersion(), '1.0.0'); assert.match(ai.getPrompt('failure_analysis'), /sustained machine sensor anomalies/i);
});

test('retries transient provider errors and returns a completion', async () => {
  process.env.FACTORYBRAIN_AI_BASE_URL = 'https://provider.test/v1'; let calls = 0;
  globalThis.fetch = async () => ++calls === 1 ? new Response('busy', { status: 503 }) : Response.json({ model: 'test-model', choices: [{ message: { content: 'Recovered' } }], usage: { total_tokens: 12 } });
  const result = await new AiService().complete({ messages: [{ role: 'user', content: 'status' }], model: 'test-model', retries: 1 });
  assert.equal(calls, 2); assert.equal(result.content, 'Recovered'); assert.equal(result.usage.total_tokens, 12);
});

test('aborts an AI request at the configured timeout', async () => {
  process.env.FACTORYBRAIN_AI_BASE_URL = 'https://provider.test/v1';
  globalThis.fetch = (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true }));
  await assert.rejects(() => new AiService().complete({ messages: [{ role: 'user', content: 'wait' }], timeoutMs: 5, retries: 0 }), /timed out/i);
});

test('executes provider tool calls and returns the final response', async () => {
  process.env.FACTORYBRAIN_AI_BASE_URL = 'https://provider.test/v1'; let calls = 0; const executions = [];
  globalThis.fetch = async () => Response.json(++calls === 1
    ? { choices: [{ message: { content: '', tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'check_inventory', arguments: '{"partId":"P001"}' } }] } }] }
    : { choices: [{ message: { content: 'P001 is available.' } }] });
  const result = await new AiService().complete({
    messages: [{ role: 'user', content: 'Check P001' }], tools: [{ type: 'function', function: { name: 'check_inventory', description: 'Check stock', parameters: { type: 'object' } } }],
    toolExecutor: async (name, args) => { executions.push({ name, args }); return { available: 3 }; },
  });
  assert.equal(calls, 2); assert.deepEqual(executions, [{ name: 'check_inventory', args: { partId: 'P001' } }]); assert.equal(result.content, 'P001 is available.'); assert.equal(result.toolResults.length, 1);
});
