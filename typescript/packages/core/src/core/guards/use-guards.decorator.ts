import 'reflect-metadata';
import { GuardConstructor } from './guard.interface.js';

/**
 * Metadata key for guards
 */
export const GUARDS_METADATA = Symbol('guards:metadata');

/**
 * UseGuards decorator - Applies guards to a tool method
 * Guards are executed before the tool handler
 * 
 * @example
 * ```typescript
 * @Tool({ name: 'whoami', ... })
 * @UseGuards(JWTGuard)
 * async whoami(input: Record<string, unknown>, context: ExecutionContext) {
 *   // This only executes if JWTGuard.canActivate returns true
 * }
 * ```
 */
export function UseGuards(...guards: GuardConstructor[]) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    // Store guards metadata for this method
    Reflect.defineMetadata(GUARDS_METADATA, guards, target, propertyKey);
    return descriptor;
  };
}

/**
 * Get guards metadata for a specific method
 */
export function getGuardsMetadata(target: object, methodName: string): GuardConstructor[] {
  return Reflect.getMetadata(GUARDS_METADATA, target, methodName) || [];
}

