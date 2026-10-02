import { Tool } from '../tool.js';

/**
 * Validates an argument object against a tool's declared input schema.
 *
 * Shared by every transform that dispatches tools on behalf of a model
 * (`call_tool`, Code Mode `callTool`), where arguments are model-authored and
 * benefit from a named, self-correcting failure ahead of execution.
 */
export function validateToolArguments(tool: Tool, args: Record<string, unknown>): Record<string, unknown> {
  // 1. Zod Schema Validation
  const schema = tool.inputSchema as any;
  if (schema && typeof schema.safeParse === 'function') {
    const result = schema.safeParse(args);
    if (!result.success) {
      const issues = result.error.issues
        .map((i: any) => `Parameter '${i.path.join('.')}': ${i.message}`)
        .join('; ');
      throw new Error(`Argument validation failed for tool '${tool.name}': ${issues}`);
    }
    return result.data as Record<string, unknown>;
  }

  // 2. JSON Schema required properties and declared types on any present field.
  if (schema && typeof schema === 'object' && (Array.isArray(schema.required) || schema.properties)) {
    const properties = schema.properties as Record<string, { type?: unknown }> | undefined;
    if (Array.isArray(schema.required)) {
      for (const req of schema.required) {
        if (args[req] === undefined) {
          throw new Error(`Missing required parameter '${req}' for tool '${tool.name}'`);
        }
      }
    }
    if (properties) {
      for (const [key, prop] of Object.entries(properties)) {
        if (args[key] === undefined) continue;
        const expected = prop?.type;
        if (typeof expected === 'string' && !jsonTypeMatches(expected, args[key])) {
          throw new Error(`Parameter '${key}' for tool '${tool.name}' must be ${expected}`);
        }
      }
    }
  }
  return args;
}

function jsonTypeMatches(expected: string, value: unknown): boolean {
  switch (expected) {
    case 'string':
      return typeof value === 'string';
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    default:
      return true;
  }
}
