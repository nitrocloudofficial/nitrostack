import 'reflect-metadata';
import {
  ToolDecorator,
  UsePipes,
  type PipeConstructor,
  type PipeInterface,
  type ToolOptions,
} from '@nitrostack/core';

/**
 * `@Tool` advertises `inputSchema` to the client but never runs it — the framework
 * hands the caller's raw arguments straight to the handler. Nothing applies zod
 * defaults, checks types, or enforces required fields.
 *
 * That fails quietly in exactly the case that matters here. A model reading the
 * schema sees `days` defaulting to 7, omits it, and the handler builds its date
 * window from `undefined` — returning an empty timeline for someone who reported
 * every day. Passing the wrong shape is worse: caller-supplied `claims` arrived as
 * strings and crashed on `.toLowerCase()` rather than being rejected.
 *
 * `@ValidatedTool` is `@Tool` plus a pipe carrying that same schema, so the
 * declared contract is the enforced one. The framework runs pipes before the
 * handler and reads them off the prototype at build time, so composing the two
 * decorators here is all it takes.
 */
export function ValidatedTool(options: ToolOptions): MethodDecorator {
  const applyTool = ToolDecorator(options);
  const schema = options.inputSchema as ZodLike | undefined;
  const applyPipe =
    schema && typeof schema.safeParse === 'function'
      ? UsePipes(zodPipe(schema))
      : null;

  return (target, propertyKey, descriptor) => {
    applyPipe?.(target, propertyKey, descriptor);
    return applyTool(target, propertyKey, descriptor);
  };
}

interface ZodLike {
  safeParse(value: unknown):
    | { success: true; data: unknown }
    | { success: false; error: { issues: Array<{ path: Array<string | number>; message: string }> } };
}

/** A pipe that parses tool input with the tool's own schema. */
function zodPipe(schema: ZodLike): PipeConstructor {
  return class ZodValidationPipe implements PipeInterface {
    transform(value: unknown) {
      // Omitting arguments entirely is legitimate for a tool whose fields all
      // have defaults, and zod fills them in from an empty object.
      const result = schema.safeParse(value ?? {});
      if (result.success) return result.data;

      const detail = result.error.issues
        .map((i) => `${i.path.join('.') || '(input)'}: ${i.message}`)
        .join('; ');
      throw new Error(`Invalid arguments — ${detail}`);
    }
  };
}
