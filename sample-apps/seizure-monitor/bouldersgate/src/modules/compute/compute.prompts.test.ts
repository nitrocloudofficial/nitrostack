import test from 'node:test';
import assert from 'node:assert/strict';
import { ComputePrompts } from './compute.prompts.js';
import type { ExecutionContext } from '@nitrostack/core';

const context = {} as ExecutionContext;

/**
 * NitroStack validates prompt messages at request time, not compile time: the
 * handler's return type is loose enough that an MCP-style
 * `{ type: 'text', text }` content block type-checks and then fails with
 * "content must be a string" only when a client actually asks for the prompt.
 * This asserts the contract the framework enforces.
 */
test('negotiate_compute returns messages in the shape NitroStack accepts', async () => {
  const messages = await new ComputePrompts().negotiatePrompt(
    { task: 'run an integration suite' },
    context,
  );

  assert.ok(Array.isArray(messages) && messages.length > 0);
  for (const message of messages) {
    assert.ok(['user', 'assistant', 'system'].includes(message.role));
    assert.equal(typeof message.content, 'string');
    assert.ok((message.content as string).length > 0);
  }
  assert.match(messages[0].content as string, /run an integration suite/);
});
