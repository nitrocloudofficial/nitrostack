import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { UNRECOGNISED_HEADLINE, describeUnrecognised, toViewModel, unrecognisedDetail, type ReportVM, type UnknownVM } from '../../src/widgets/lib/view-model.js';
import { outputFromMessage } from '../../src/widgets/lib/tool-output.js';

// A real generate_report result with the deployed shape: absolute https links with ?t=TOKEN, no inline data.
const result = JSON.parse(readFileSync(new URL('../fixtures/widget/generate_report.result.json', import.meta.url), 'utf8')) as {
  content: Array<{ type: string; text: string }>;
  structuredContent: Record<string, unknown>;
  _meta: Record<string, unknown>;
};

function asReport(o: unknown): ReportVM {
  const vm = toViewModel(o);
  expect(vm.kind).toBe('report');
  return vm as ReportVM;
}

describe('real-shaped generate_report result', () => {
  it('fixture holds no secret and no inline data', () => {
    const text = JSON.stringify(result);
    expect(text).toContain('?t=TOKEN');
    expect(text).not.toMatch(/"inline"/);
    expect(text).not.toMatch(/[?&]t=(?!TOKEN)/);
  });

  it('classifies as a report with three linked files', () => {
    const vm = asReport(result.structuredContent);
    expect(vm.score).toBe(17);
    expect(vm.findingTotal).toBe(11);
    expect(vm.pages).toBe(7);
    expect(vm.expiresInMinutes).toBe(10);
    expect(vm.files.map((f) => f.format)).toEqual(['pdf', 'sarif', 'sbom']);
    expect(vm.files.every((f) => f.href?.startsWith('https://') && f.href.endsWith('?t=TOKEN'))).toBe(true);
    expect(vm.files.every((f) => f.inline === undefined)).toBe(true);
    expect(vm.topFindings).toHaveLength(3);
  });

  it('does not depend on the multi-line message', () => {
    expect(asReport({ ...result.structuredContent, message: 'a\nb\n\nc' }).message).toBe('a\nb\n\nc');
  });
});

describe('delivery wrappers', () => {
  const sc = result.structuredContent;
  const wrapped: Record<string, unknown> = {
    'bare structuredContent': sc,
    'full result': result,
    'content blocks only': { content: result.content },
    'content array only': result.content,
    'JSON text': result.content[0].text,
    'JSON string of structuredContent': JSON.stringify(sc),
    '{result: full}': { result },
    '{result: structuredContent}': { result: sc },
    '{data: structuredContent}': { data: sc },
    '{output: JSON string}': { output: JSON.stringify(sc) },
    'MCP Apps params': { params: result },
    'doubly wrapped': { result: { structuredContent: sc } },
    'contents array': { contents: [{ mimeType: 'application/json', text: JSON.stringify(sc) }] }
  };
  it.each(Object.entries(wrapped))('finds the report in %s', (_name, input) => {
    expect(asReport(input).reportId).toBe(sc.reportId);
  });

  it('stops unwrapping at a sane depth', () => {
    let deep: unknown = sc;
    for (let i = 0; i < 12; i++) deep = { result: deep };
    expect(toViewModel(deep).kind).toBe('unknown');
  });

  it('classifies the other tools through the same wrappers', () => {
    const plan = { stack: 'php', goal: 'modernize_all', stages: [] };
    expect(toViewModel({ result: plan }).kind).toBe('plan');
    expect(toViewModel({ content: [{ type: 'text', text: JSON.stringify({ stack: 'php', score: { overall: 50 } }) }] }).kind).toBe('assessment');
  });
});

describe('outputFromMessage', () => {
  const sc = result.structuredContent;
  it('reads every known host message', () => {
    expect(outputFromMessage({ type: 'TOOL_OUTPUT', data: sc })).toBe(sc);
    expect(outputFromMessage({ type: 'toolOutput', data: sc })).toBe(sc);
    expect(outputFromMessage({ type: 'NITRO_INJECT_OPENAI', data: { toolOutput: sc } })).toBe(sc);
    expect(outputFromMessage({ type: 'NITRO_INJECT_OPENAI', openai: { toolOutput: sc } })).toBe(sc);
    expect(outputFromMessage({ type: 'setGlobals', globals: { toolOutput: sc } })).toBe(sc);
    expect(outputFromMessage({ jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: result })).toBe(result);
  });
  it('ignores messages with no result, and a null result', () => {
    expect(outputFromMessage({ type: 'NITRO_INJECT_OPENAI', data: { toolOutput: null } })).toBeUndefined();
    expect(outputFromMessage({ type: 'setGlobals', globals: { theme: 'dark' } })).toBeUndefined();
    expect(outputFromMessage({ type: 'NITRO_WIDGET_RPC_RESPONSE', id: 'x' })).toBeUndefined();
    expect(outputFromMessage(null)).toBeUndefined();
    expect(outputFromMessage('x')).toBeUndefined();
  });
});

describe('unrecognised state', () => {
  it('is empty only when nothing arrived', () => {
    for (const nothing of [null, undefined, {}, [], '']) expect(toViewModel(nothing)).toEqual({ kind: 'empty' });
  });

  it('is unknown, never empty, for data it cannot classify', () => {
    for (const odd of [{ foo: 1 }, 'plain text', 42, true, [1, 2], { content: [{ type: 'text', text: 'hello' }] }, { score: 'x' }, { reportId: 'x', files: [], score: null }]) {
      expect(toViewModel(odd).kind).toBe('unknown');
    }
  });

  it('lists key names, never values', () => {
    const vm = toViewModel({ alpha: 'SECRET-VALUE', beta: { token: 'SECRET-VALUE' } }) as UnknownVM;
    expect(vm).toEqual({ kind: 'unknown', shape: 'object', keys: ['alpha', 'beta'] });
    const text = `${UNRECOGNISED_HEADLINE} ${unrecognisedDetail(vm)}`;
    expect(text).toContain('alpha, beta');
    expect(text).not.toContain('SECRET-VALUE');
    expect(JSON.stringify(vm)).not.toContain('SECRET-VALUE');
    expect(JSON.stringify(describeUnrecognised('{"k":"SECRET-VALUE"}'))).not.toContain('SECRET-VALUE');
    expect(describeUnrecognised('{"k":"v"}').keys).toEqual(['k']);
  });

  it('caps the number and length of key names', () => {
    const many = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`k${i}`, i]));
    expect(describeUnrecognised(many).keys).toHaveLength(20);
    expect(describeUnrecognised({ ['x'.repeat(200)]: 1 }).keys[0].length).toBeLessThanOrEqual(40);
  });

  it('describes text, lists and key-less results', () => {
    expect(unrecognisedDetail(describeUnrecognised('hello'))).toBe('The result was text, not an object.');
    expect(unrecognisedDetail(describeUnrecognised([1]))).toBe('The result was a list with no named keys.');
    expect(unrecognisedDetail(describeUnrecognised(7))).toBe('The result had no named keys.');
  });

  it('adds the render error name to the detail', () => {
    const vm = describeUnrecognised({ a: 1 });
    expect(unrecognisedDetail(vm, 'TypeError')).toBe('Top-level keys: a. Rendering failed with TypeError.');
  });

  it('never throws, even when reading a key throws', () => {
    const evil = new Proxy({}, { ownKeys: () => { throw new Error('boom'); } });
    expect(toViewModel(evil).kind).toBe('unknown');
    expect(describeUnrecognised(evil).keys).toEqual([]);
  });
});
