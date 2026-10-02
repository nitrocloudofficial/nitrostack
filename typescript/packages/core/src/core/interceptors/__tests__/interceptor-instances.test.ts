import { describe, it, expect } from '@jest/globals';
import 'reflect-metadata';
import { z } from 'zod';
import { UseInterceptors, getInterceptorMetadata } from '../interceptor.decorator.js';
import { InterceptorInterface } from '../interceptor.interface.js';
import { Tool } from '../../tool.js';
import { Controller, Tool as ToolDecorator } from '../../decorators.js';
import { buildTools } from '../../builders.js';

class MockConfiguredInterceptor implements InterceptorInterface {
  constructor(private readonly tag: string) {}
  async intercept(_context: any, next: () => Promise<unknown>): Promise<unknown> {
    const res = (await next()) as Record<string, unknown>;
    return { ...res, tag: this.tag };
  }
}

class MockOrderTrackerInterceptor implements InterceptorInterface {
  constructor(private readonly name: string, private readonly order: string[]) {}
  async intercept(_context: any, next: () => Promise<unknown>): Promise<unknown> {
    this.order.push(`${this.name}:before`);
    const res = await next();
    this.order.push(`${this.name}:after`);
    return res;
  }
}

class MockConstructorInterceptor implements InterceptorInterface {
  async intercept(_context: any, next: () => Promise<unknown>): Promise<unknown> {
    const res = (await next()) as Record<string, unknown>;
    return { ...res, fromConstructor: true };
  }
}

describe('Configured Interceptor Instances & Class-Level Decorators (NITRO-105-M1)', () => {
  it('combines class-level and method-level interceptors in definition order', () => {
    const classInstance = new MockConfiguredInterceptor('class-level');
    const methodInstance = new MockConfiguredInterceptor('method-level');

    @UseInterceptors(classInstance)
    class TestController {
      @UseInterceptors(methodInstance)
      async executeQuery() {
        return { data: 123 };
      }
    }

    const metadata = getInterceptorMetadata(TestController.prototype, 'executeQuery');
    expect(metadata.length).toBe(2);
    expect(metadata[0]).toBe(classInstance);
    expect(metadata[1]).toBe(methodInstance);
  });

  it('executes pre-configured interceptor instance inside Tool pipeline', async () => {
    const instance = new MockConfiguredInterceptor('configured-10kb');

    const tool = new Tool({
      name: 'query_records',
      description: 'Query records with interceptor',
      inputSchema: z.object({}),
      interceptors: [instance],
      handler: async () => ({ rows: [1, 2, 3] }),
    });

    const result = await tool.execute({}, { logger: console } as any);
    expect(result).toEqual({ rows: [1, 2, 3], tag: 'configured-10kb' });
  });

  it('executes mixed constructor tokens and object instances in onion order', async () => {
    const executionOrder: string[] = [];
    const classLevelInstance = new MockOrderTrackerInterceptor('classInstance', executionOrder);
    const methodLevelInstance = new MockOrderTrackerInterceptor('methodInstance', executionOrder);

    const tool = new Tool({
      name: 'onion_test',
      description: 'Tests onion execution order',
      inputSchema: z.object({}),
      interceptors: [classLevelInstance, MockConstructorInterceptor, methodLevelInstance],
      handler: async () => {
        executionOrder.push('handler');
        return { success: true };
      },
    });

    const result = await tool.execute({}, { logger: console } as any);

    expect(executionOrder).toEqual([
      'classInstance:before',
      'methodInstance:before',
      'handler',
      'methodInstance:after',
      'classInstance:after',
    ]);
    expect(result).toEqual({ success: true, fromConstructor: true });
  });

  it('applies class-level interceptor to all tools built via buildTools', async () => {
    const classInstance = new MockConfiguredInterceptor('class-wide');

    @Controller()
    @UseInterceptors(classInstance)
    class ReportController {
      @ToolDecorator({ name: 'summary_report', description: 'Summary report', inputSchema: z.object({}) })
      async getSummary() {
        return { report: 'summary' };
      }

      @ToolDecorator({ name: 'detail_report', description: 'Detail report', inputSchema: z.object({}) })
      async getDetail() {
        return { report: 'detail' };
      }
    }

    const tools = buildTools(new ReportController() as any);
    expect(tools.length).toBe(2);

    const summaryTool = tools.find((t) => t.name === 'summary_report');
    const detailTool = tools.find((t) => t.name === 'detail_report');

    expect(summaryTool).toBeDefined();
    expect(detailTool).toBeDefined();

    const summaryRes = await summaryTool!.execute({}, { logger: console } as any);
    expect(summaryRes).toEqual({ report: 'summary', tag: 'class-wide' });

    const detailRes = await detailTool!.execute({}, { logger: console } as any);
    expect(detailRes).toEqual({ report: 'detail', tag: 'class-wide' });
  });

  it('maintains backwards compatibility with constructor tokens in @UseInterceptors', () => {
    class LegacyController {
      @UseInterceptors(MockConstructorInterceptor)
      method() {}
    }

    const metadata = getInterceptorMetadata(LegacyController.prototype, 'method');
    expect(metadata).toEqual([MockConstructorInterceptor]);
  });
});
