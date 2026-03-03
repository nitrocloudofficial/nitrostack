import 'reflect-metadata';
import { PipeConstructor } from './pipe.interface.js';
import type { ClassConstructor } from '../types.js';

const PIPE_KEY = 'nitrostack:pipe';
const IS_PIPE_KEY = 'nitrostack:is_pipe';
const PARAM_PIPES_KEY = 'nitrostack:param_pipes';

/**
 * Marks a class as a pipe
 * 
 * @example
 * ```typescript
 * @Pipe()
 * export class ValidationPipe implements PipeInterface {
 *   transform(value: unknown, metadata: ArgumentMetadata) {
 *     // Validate and transform
 *     return value;
 *   }
 * }
 * ```
 */
export function Pipe(): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(IS_PIPE_KEY, true, target);
  };
}

/**
 * Apply pipes to tool input (entire input object)
 * 
 * @example
 * ```typescript
 * @Tool({ name: 'create_user', ... })
 * @UsePipes(ValidationPipe, TransformPipe)
 * async createUser(input: unknown) { }
 * ```
 */
export function UsePipes(...pipes: PipeConstructor[]): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const existingPipes = Reflect.getMetadata(PIPE_KEY, target, propertyKey) || [];
    Reflect.defineMetadata(
      PIPE_KEY,
      [...existingPipes, ...pipes],
      target,
      propertyKey
    );
  };
}

/**
 * Parameter decorator to apply pipes to specific parameters
 * 
 * @example
 * ```typescript
 * @Tool({ name: 'create_user', ... })
 * async createUser(@Body(ValidationPipe) input: CreateUserDto) { }
 * ```
 */
export function Body(...pipes: PipeConstructor[]): ParameterDecorator {
  return (target: object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (!propertyKey) return;
    
    const existingParams = Reflect.getMetadata(PARAM_PIPES_KEY, target, propertyKey) || {};
    existingParams[parameterIndex] = {
      type: 'body',
      pipes,
    };
    Reflect.defineMetadata(PARAM_PIPES_KEY, existingParams, target, propertyKey);
  };
}

/**
 * Shorthand for validation pipe
 */
export function Validated(): ParameterDecorator {
  return Body(); // Can be enhanced with default validation pipe
}

/**
 * Parameter pipes metadata
 */
interface ParamPipeMetadata {
  type: string;
  pipes: PipeConstructor[];
}

/**
 * Get pipes for a method
 */
export function getPipeMetadata(target: object, propertyKey: string | symbol): PipeConstructor[] {
  return Reflect.getMetadata(PIPE_KEY, target, propertyKey) || [];
}

/**
 * Get parameter pipes for a method
 */
export function getParamPipesMetadata(target: object, propertyKey: string | symbol): Record<number, ParamPipeMetadata> {
  return Reflect.getMetadata(PARAM_PIPES_KEY, target, propertyKey) || {};
}

/**
 * Check if a class is marked as a pipe
 */
export function isPipe(target: ClassConstructor): boolean {
  return Reflect.getMetadata(IS_PIPE_KEY, target) === true;
}

