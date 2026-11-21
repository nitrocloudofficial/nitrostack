import { describe, it, expect } from '@jest/globals';
import 'reflect-metadata';
import { z } from 'zod';
import { Tool } from '../tool.js';
import { ExecutionContext } from '../types.js';
import { Guard } from '../guards/guard.interface.js';
import { MiddlewareInterface } from '../middleware/middleware.interface.js';
import { InterceptorInterface } from '../interceptors/interceptor.interface.js';
import { PipeInterface } from '../pipes/pipe.interface.js';

const seen: Record<string, unknown> = {};

class RecordingGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    seen.guard = context.input;
    return true;
  }
}

class RecordingMiddleware implements MiddlewareInterface {
  async use(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown> {
    seen.middleware = context.input;
    return next();
  }
}

class RecordingInterceptor implements InterceptorInterface {
  async intercept(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown> {
    seen.interceptor = context.input;
    return next();
  }
}

class UppercasePipe implements PipeInterface {
  async transform(value: unknown): Promise<unknown> {
    const input = value as { city: string };
    return { ...input, city: input.city.toUpperCase() };
  }
}

describe('Tool.execute() context.input', () => {
  it('exposes tool arguments to guards, middleware and interceptors', async () => {
    const tool = new Tool({
      name: 'book_flight',
      description: 'Book a flight',
      inputSchema: z.object({ from: z.string(), to: z.string() }),
      guards: [RecordingGuard],
      middlewares: [RecordingMiddleware],
      interceptors: [RecordingInterceptor],
      handler: async (_input, context) => {
        seen.handler = context.input;
        return { ok: true };
      },
    });

    const args = { from: 'SFO', to: 'JFK' };
    const result = await tool.execute(args, { requestId: 'r1', logger: console } as unknown as ExecutionContext);

    expect(result).toEqual({ ok: true });
    expect(seen.guard).toEqual(args);
    expect(seen.middleware).toEqual(args);
    expect(seen.interceptor).toEqual(args);
    expect(seen.handler).toEqual(args);
  });

  it('keeps the original arguments on context.input when pipes transform the input', async () => {
    let handlerInput: unknown;
    let contextInput: unknown;
    const tool = new Tool({
      name: 'weather',
      description: 'Weather lookup',
      inputSchema: z.object({ city: z.string() }),
      pipes: [UppercasePipe],
      handler: async (input, context) => {
        handlerInput = input;
        contextInput = context.input;
        return {};
      },
    });

    await tool.execute({ city: 'paris' }, { requestId: 'r2', logger: console } as unknown as ExecutionContext);

    expect(handlerInput).toEqual({ city: 'PARIS' });
    expect(contextInput).toEqual({ city: 'paris' });
  });
});
