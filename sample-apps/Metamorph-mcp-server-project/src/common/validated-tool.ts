// Drop-in replacement for NitroStack's @Tool decorator: same options, but the handler receives input that was parsed with the
// tool's own zod schema. The handler wrapper runs after the guards, so an unauthenticated caller gets the 401/403 first and
// only an authorised caller sees input errors. The wrapper also makes the SDK-level deferral safe: sdk-validation.ts only
// defers the SDK's schema error for tools registered here.
import { ToolDecorator } from '@nitrostack/core';
import { validateInput } from './input-validation.js';

type Options = Parameters<typeof ToolDecorator>[0];

// Names of tools whose handler validates its own input (see sdk-validation.ts).
export const SELF_VALIDATING_TOOLS = new Set<string>();

export function Tool(options: Options): MethodDecorator {
  const decorate = ToolDecorator(options) as unknown as MethodDecorator;
  const spec = { name: options.name, inputSchema: options.inputSchema as never, examples: options.examples as { request?: unknown } | undefined };
  return (target, propertyKey, descriptor) => {
    const original = descriptor.value as unknown as (this: unknown, input: unknown, ...rest: unknown[]) => unknown;
    descriptor.value = async function (this: unknown, input: unknown, ...rest: unknown[]) {
      return original.call(this, validateInput(spec, input), ...rest);
    } as never;
    SELF_VALIDATING_TOOLS.add(options.name);
    return decorate(target, propertyKey, descriptor) ?? descriptor;
  };
}
