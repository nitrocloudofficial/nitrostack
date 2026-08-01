import { z } from '@nitrostack/core';
import type { ZodTypeAny } from 'zod';
import type { JsonSchemaNode } from './surgeguard-contract.js';

function scalarSchema(type: string, schema: JsonSchemaNode): ZodTypeAny {
  switch (type) {
    case 'string': {
      let value = z.string();
      if (schema.format === 'uuid') value = value.uuid();
      if (schema.format === 'date-time') value = value.datetime({ offset: true });
      if (schema.minLength !== undefined) value = value.min(schema.minLength);
      if (schema.maxLength !== undefined) value = value.max(schema.maxLength);
      return value;
    }
    case 'integer': {
      let value = z.number().int();
      if (schema.minimum !== undefined) value = value.min(schema.minimum);
      if (schema.maximum !== undefined) value = value.max(schema.maximum);
      return value;
    }
    case 'number': {
      let value = z.number();
      if (schema.minimum !== undefined) value = value.min(schema.minimum);
      if (schema.maximum !== undefined) value = value.max(schema.maximum);
      return value;
    }
    case 'boolean':
      return z.boolean();
    case 'null':
      return z.null();
    case 'array':
      return z.array(jsonSchemaToZod(schema.items ?? {}));
    case 'object': {
      const required = new Set(schema.required ?? []);
      const shape: Record<string, ZodTypeAny> = {};

      for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
        const property = jsonSchemaToZod(propertySchema);
        shape[key] = required.has(key) ? property : property.optional();
      }

      const value = z.object(shape);
      if (schema.additionalProperties === false) return value.strict();
      return value.passthrough();
    }
    default:
      return z.unknown();
  }
}

export function jsonSchemaToZod(schema: JsonSchemaNode): ZodTypeAny {
  if (schema.enum?.length) {
    const literals = schema.enum.map((value) => z.literal(value as never));
    const value = literals.length === 1
      ? literals[0]
      : z.union(literals as unknown as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
    return schema.description ? value.describe(schema.description) : value;
  }

  const types = Array.isArray(schema.type)
    ? schema.type
    : [schema.type ?? 'unknown'];
  const schemas = types.map((type) => scalarSchema(type, schema));
  const value = schemas.length === 1
    ? schemas[0]
    : z.union(schemas as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);

  return schema.description ? value.describe(schema.description) : value;
}
