import { z } from 'zod';

/**
 * Converts a Zod Schema into a standard JSON Schema object for MCP tool definitions.
 */
export function zodToJsonSchema(schema: z.ZodType<unknown>): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = value as z.ZodTypeAny;
      properties[key] = {
        type: getZodTypeName(fieldSchema),
        description: fieldSchema.description || undefined,
      };
      if (!fieldSchema.isOptional()) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  return { type: 'object', properties: {} };
}

function getZodTypeName(schema: z.ZodTypeAny): string {
  if (schema instanceof z.ZodString) return 'string';
  if (schema instanceof z.ZodNumber) return 'number';
  if (schema instanceof z.ZodBoolean) return 'boolean';
  if (schema instanceof z.ZodArray) return 'array';
  if (schema instanceof z.ZodObject) return 'object';
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return getZodTypeName(schema.unwrap());
  }
  if (schema instanceof z.ZodDefault) {
    return getZodTypeName(schema._def.innerType);
  }
  return 'string';
}
