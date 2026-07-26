import type { StandardJSONSchemaV1, StandardSchemaV1, StandardTypedV1 } from "@standard-schema/spec";
export type { StandardJSONSchemaV1, StandardSchemaV1, StandardTypedV1 };
/**
 * A schema that implements both Standard Schema (validation) and Standard JSON
 * Schema (serialization). Zod v4, ArkType, and Valibot (via
 * `@valibot/to-json-schema`) all satisfy this.
 *
 * Mirrors the type of the same name in `@modelcontextprotocol/core` v2 so that
 * bumping to that package later is a drop-in import swap.
 *
 * @see https://standardschema.dev/
 * @see https://github.com/modelcontextprotocol/typescript-sdk/pull/1689
 */
export interface StandardSchemaWithJSON<Input = unknown, Output = Input> {
    readonly "~standard": StandardSchemaV1.Props<Input, Output> & StandardJSONSchemaV1.Props<Input, Output>;
}
export declare namespace StandardSchemaWithJSON {
    type InferInput<S extends StandardTypedV1> = StandardTypedV1.InferInput<S>;
    type InferOutput<S extends StandardTypedV1> = StandardTypedV1.InferOutput<S>;
}
/**
 * Serialize a Standard Schema to JSON Schema for the given direction.
 *
 * Uses `~standard.jsonSchema` when present (zod v4, ArkType, Valibot, …).
 * Falls back to a lazy `zod/v4` import for zod v3.25.x — which implements
 * `~standard.validate` but not yet `~standard.jsonSchema` — so the existing
 * `^3.25.0 || ^4.0.0` peer range keeps working. Non-zod schemas without
 * `jsonSchema` throw.
 */
export declare function standardSchemaToJsonSchema(schema: StandardSchemaV1, io: "input" | "output"): Promise<Record<string, unknown>>;
/**
 * Validate a value against a Standard Schema. Returns the parsed value on
 * success or throws with a formatted issue list (optionally prefixed).
 */
export declare function validateStandardSchema<S extends StandardSchemaV1>(schema: S, value: unknown, errorPrefix?: string): Promise<StandardSchemaV1.InferOutput<S>>;
