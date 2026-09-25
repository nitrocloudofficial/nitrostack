import { ControllerDecorator as Controller, ToolDecorator as Tool, z } from '@nitrostack/core';

@Controller('data')
export class DataController {
  @Tool({
    name: 'filter_records',
    description: 'Filter an array of numeric records by threshold value',
    annotations: { readOnlyHint: true },
    inputSchema: z.object({
      values: z.array(z.number()).describe('Input numbers'),
      min: z.number().describe('Minimum threshold value'),
    }),
  })
  async filterRecords(input: { values: number[]; min: number }) {
    return { filtered: input.values.filter((v) => v >= input.min) };
  }

  @Tool({
    name: 'aggregate_sum',
    description: 'Compute statistical sum and average of an array of numbers',
    annotations: { readOnlyHint: true },
    inputSchema: z.object({
      values: z.array(z.number()).describe('Numbers to aggregate'),
    }),
  })
  async aggregateSum(input: { values: number[] }) {
    const sum = input.values.reduce((a, b) => a + b, 0);
    const avg = input.values.length > 0 ? sum / input.values.length : 0;
    return { sum, avg, count: input.values.length };
  }

  @Tool({
    name: 'transform_format',
    description: 'Transform records into a designated output format',
    annotations: { readOnlyHint: true },
    inputSchema: z.object({
      prefix: z.string().describe('Item label prefix'),
      values: z.array(z.number()).describe('Input numbers'),
    }),
  })
  async transformFormat(input: { prefix: string; values: number[] }) {
    return {
      formatted: input.values.map((v, i) => `${input.prefix}-${i + 1}: ${v}`),
    };
  }
}
