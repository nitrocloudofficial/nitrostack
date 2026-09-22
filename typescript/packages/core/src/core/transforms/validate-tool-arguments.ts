import { Tool } from '../tool.js';

/**
 * Validates an argument object against a tool's declared input schema.
 *
 * Shared by every transform that dispatches tools on behalf of a model
 * (`call_tool`, Code Mode `callTool`), where arguments are model-authored and
 * benefit from a named, self-correcting failure ahead of execution.
 */
export function validateToolArguments(tool: Tool, args: Record<string, unknown>): void {
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
    return;
  }

  // 2. JSON Schema Required Properties Validation
  if (schema && typeof schema === 'object' && Array.isArray(schema.required)) {
    for (const req of schema.required) {
      if (args[req] === undefined) {
        throw new Error(`Missing required parameter '${req}' for tool '${tool.name}'`);
      }
    }
  }
}
