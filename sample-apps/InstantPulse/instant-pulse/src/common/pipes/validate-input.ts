import { Pipe, UsePipes, z, type ArgumentMetadata, type PipeInterface } from '@nitrostack/core';

/**
 * Actually run a tool's Zod schema against its input.
 *
 * NitroStack converts `inputSchema` to JSON Schema so clients can see the tool's
 * shape, but it does not parse incoming arguments with it. Nothing validates,
 * and — more surprising — `.default()` values are never applied. A client that
 * omits an optional field hands the handler `undefined`, which then propagates
 * as `NaN` into date arithmetic and surfaces as something unhelpful like
 * "Invalid time value" three layers down.
 *
 * Applying this pipe makes the declared schema mean what it says: defaults are
 * filled in, types are coerced where the schema allows, and bad input is
 * rejected at the boundary with a message naming the offending field.
 *
 * @example
 * const Input = z.object({ applicationId: z.string(), windowDays: z.number().default(180) });
 *
 * @Tool({ name: 'do_thing', inputSchema: Input, ... })
 * @ValidateInput(Input)
 * async doThing(input: z.infer<typeof Input>, ctx: ExecutionContext) { … }
 */
export function ValidateInput(schema: z.ZodTypeAny): MethodDecorator {
  class SchemaValidationPipe implements PipeInterface {
    transform(value: unknown, _metadata: ArgumentMetadata) {
      const result = schema.safeParse(value ?? {});

      if (!result.success) {
        const problems = result.error.issues
          .map((issue) => {
            const path = issue.path.join('.') || '(root)';
            return `${path}: ${issue.message}`;
          })
          .join('; ');

        throw new Error(`Invalid arguments — ${problems}`);
      }

      return result.data;
    }
  }

  // Applied programmatically because the class is declared inside a function.
  Pipe()(SchemaValidationPipe);

  return UsePipes(SchemaValidationPipe as unknown as Parameters<typeof UsePipes>[0]);
}
