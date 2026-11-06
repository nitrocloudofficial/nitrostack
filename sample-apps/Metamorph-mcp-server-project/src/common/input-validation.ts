// Input validation with messages that name a next step.
//
// Why this exists: the MCP SDK validates tool arguments against the advertised JSON Schema (ajv) before any NitroStack guard,
// pipe or filter runs, and its text ("Input validation error: Invalid arguments for tool X: data/repo_url must NOT have fewer
// than 10 characters") names no next step. The schema cannot change that text (ajv runs with strict:false and without the
// errorMessage keyword; see docs/EVAL_RESULTS.md section 1). So the SDK result is deferred (see sdk-validation.ts) and the tool
// validates its own input with the SAME zod schema, after the auth guard, with the formatter below.
//
// Message shape: Invalid input for <tool>: <field> <problem>. Next step: <hint from the field description>. Example: <request>
// The offending value is never echoed (it may be a secret or an injection attempt): only its type name appears.
import type { z } from '@nitrostack/core';

type Issue = z.ZodIssue;
type Shape = Record<string, z.ZodTypeAny>;

export interface ToolInputSpec {
  name: string;
  inputSchema: z.ZodTypeAny;
  examples?: { request?: unknown };
}

const MAX_MESSAGE = 700;
const MAX_PROBLEMS = 3;
const MAX_HINT = 160;
const MAX_EXAMPLE = 260;

const cap = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 3).trimEnd()}...` : text);
const article = (word: string) => (/^[aeiou]/.test(word) ? 'an' : 'a');
// zod reports an enum or literal given the wrong type as expected "'aws'" (not a type name): show it as is.
const typeWord = (t: string) => (t === 'array' ? 'a list' : t === 'object' ? 'an object' : /^[a-z]+$/.test(t) ? `${article(t)} ${t}` : t);
const gotWord = (t: string) => (t === 'undefined' ? 'missing' : t === 'null' ? 'null' : `${article(t)} ${t}`);
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

function fieldOf(path: (string | number)[]): string {
  if (path.length === 0) return 'arguments';
  return path.reduce<string>((acc, p) => (typeof p === 'number' ? `${acc}[${p}]` : acc ? `${acc}.${p}` : p), '');
}

// A union (oneOrMany, optional combos) fails once per branch. Show what each branch wanted if the type was wrong everywhere;
// otherwise the branch whose type matched holds the useful message (too long, too short, bad format).
function describeUnion(issue: z.ZodInvalidUnionIssue): { field: string; problem: string } {
  const branches = issue.unionErrors.map((e) => e.issues);
  const here = fieldOf(issue.path);
  const typeOnly = branches.every((b) => b.length > 0 && b[0].code === 'invalid_type' && fieldOf(b[0].path) === here);
  if (typeOnly) {
    const wanted = [...new Set(branches.map((b) => (b[0] as z.ZodInvalidTypeIssue).expected as string))].map(typeWord);
    const got = (branches[0][0] as z.ZodInvalidTypeIssue).received as string;
    return { field: here, problem: `must be ${wanted.join(' or ')} (got ${gotWord(got)})` };
  }
  const matched = branches.find((b) => b.length > 0 && b[0].code !== 'invalid_type') ?? branches[0];
  return describe(matched[0] ?? issue);
}

function describe(issue: Issue): { field: string; problem: string } {
  const field = fieldOf(issue.path);
  switch (issue.code) {
    case 'invalid_type':
      return { field, problem: issue.received === 'undefined' ? 'is required' : `must be ${typeWord(issue.expected)} (got ${gotWord(issue.received)})` };
    case 'too_small': {
      const n = Number(issue.minimum);
      if (issue.type === 'string') return { field, problem: n <= 1 ? 'must not be empty' : `must be at least ${plural(n, 'character')} long` };
      if (issue.type === 'array') return { field, problem: n <= 1 ? 'must not be empty' : `must have at least ${plural(n, 'item')}` };
      return { field, problem: `must be ${issue.inclusive ? 'at least' : 'more than'} ${n}` };
    }
    case 'too_big': {
      const n = Number(issue.maximum);
      if (issue.type === 'string') return { field, problem: `must be at most ${plural(n, 'character')} long` };
      if (issue.type === 'array') return { field, problem: `must have at most ${plural(n, 'item')}` };
      return { field, problem: `must be ${issue.inclusive ? 'at most' : 'less than'} ${n}` };
    }
    case 'invalid_enum_value':
      return { field, problem: `must be one of: ${issue.options.map(String).join(', ')}` };
    case 'invalid_literal':
      return { field, problem: 'has an unsupported value' };
    case 'invalid_string':
      // zod's own default for a regex is the bare word "Invalid"; a message we wrote in the schema is static text and safe.
      return { field, problem: issue.validation === 'regex' && issue.message !== 'Invalid' ? `has an invalid format (${issue.message})` : 'has an invalid format' };
    case 'unrecognized_keys':
      return { field, problem: 'contains fields this tool does not accept' };
    case 'invalid_union':
      return describeUnion(issue);
    case 'custom':
      return { field, problem: issue.message };
    default:
      return { field, problem: 'is not valid' };
  }
}

function topField(schema: z.ZodTypeAny, field: string): { key?: string; description?: string } {
  const key = field.split(/[.[]/)[0];
  const shape = (schema as unknown as { shape?: Shape }).shape;
  const description = shape?.[key]?.description;
  return { key: shape?.[key] ? key : undefined, description };
}

const firstSentence = (text: string) => cap(text.replace(/\s+/g, ' ').trim(), MAX_HINT);

export function formatInputError(spec: ToolInputSpec, error: z.ZodError): string {
  const seen = new Set<string>();
  const problems: { field: string; problem: string }[] = [];
  for (const issue of error.issues) {
    const p = describe(issue);
    const text = `${p.field} ${p.problem}`;
    if (seen.has(text)) continue;
    seen.add(text);
    problems.push(p);
  }
  const shown = problems.slice(0, MAX_PROBLEMS).map((p) => `${p.field} ${p.problem}`);
  const more = problems.length > MAX_PROBLEMS ? ` (and ${problems.length - MAX_PROBLEMS} more)` : '';
  const first = problems[0];
  const { key, description } = first ? topField(spec.inputSchema, first.field) : {};
  const hint = key
    ? `fix "${key}"${description ? ` (${firstSentence(description)})` : ''} and call ${spec.name} again`
    : `send a JSON object that matches the ${spec.name} input schema and call it again`;
  let example = '';
  if (spec.examples?.request !== undefined) {
    try {
      example = ` Example: ${cap(JSON.stringify(spec.examples.request), MAX_EXAMPLE)}`;
    } catch {
      /* no example */
    }
  }
  return cap(`Invalid input for ${spec.name}: ${shown.join('; ')}${more}. Next step: ${hint}.${example}`, MAX_MESSAGE);
}

// Parses with the tool's own zod schema. Throws one Error whose message names the next step. Unknown fields are dropped.
export function validateInput<T = unknown>(spec: ToolInputSpec, raw: unknown): T {
  const result = spec.inputSchema.safeParse(raw ?? {});
  if (result.success) return result.data as T;
  throw new Error(formatInputError(spec, result.error));
}
