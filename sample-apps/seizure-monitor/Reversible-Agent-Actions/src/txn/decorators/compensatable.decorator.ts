import 'reflect-metadata';
import type { CompensatorSpec } from '../types.js';

/** Metadata key under which a method's compensator spec is stored via reflect-metadata. */
export const COMPENSATABLE_META = Symbol('nitro:compensatable');

/**
 * Marks a tool method with its compensator spec (toolName is inferred at registration
 * time from the method name, so it is omitted here). Stores the spec as reflect-metadata
 * on the method and returns the descriptor unchanged.
 */
export function Compensatable(spec: Omit<CompensatorSpec, 'toolName'>): MethodDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(COMPENSATABLE_META, spec, descriptor.value);
    return descriptor;
  };
}
