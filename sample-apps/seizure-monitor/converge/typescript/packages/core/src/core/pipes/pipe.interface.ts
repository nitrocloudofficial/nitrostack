import 'reflect-metadata';

/**
 * Constructor type for metatype
 */
type MetaType = new (...args: unknown[]) => unknown;

/**
 * Argument metadata for pipe transformation
 */
export interface ArgumentMetadata {
  type: 'body' | 'param' | 'query' | 'custom';
  metatype?: MetaType;
  data?: string | undefined;
}

/**
 * Pipe Interface
 * 
 * Pipes are used to transform and validate input data before it reaches the tool handler.
 * Similar to NestJS pipes.
 * 
 * @example
 * ```typescript
 * @Pipe()
 * export class ValidationPipe implements PipeInterface {
 *   transform(value: unknown, metadata: ArgumentMetadata) {
 *     if (!this.isValid(value)) {
 *       throw new Error('Validation failed');
 *     }
 *     return value;
 *   }
 * }
 * ```
 */
export interface PipeInterface<T = unknown, R = unknown> {
  transform(value: T, metadata: ArgumentMetadata): R | Promise<R>;
}

/**
 * Pipe constructor type
 */
export type PipeConstructor = new (...args: unknown[]) => PipeInterface;

