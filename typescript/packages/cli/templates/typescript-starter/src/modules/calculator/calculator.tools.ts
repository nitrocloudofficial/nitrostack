import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import * as path from 'path';

export class CalculatorTools {
  @Tool({
    name: 'calculate',
    description: 'Perform basic arithmetic calculations',
    inputSchema: z.object({
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('The operation to perform'),
      a: z.number().finite().describe('First number'),
      b: z.number().finite().describe('Second number')
    }),
    examples: {
      request: {
        operation: 'add',
        a: 5,
        b: 3
      },
      response: {
        operation: 'add',
        a: 5,
        b: 3,
        result: 8,
        expression: '5 + 3 = 8'
      }
    }
  })
  @Widget('calculator-result')
  async calculate(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Performing calculation', {
      operation: input.operation,
      a: input.a,
      b: input.b
    });

    let result: number;
    let symbol: string;

    switch (input.operation) {
      case 'add':
        result = input.a + input.b;
        symbol = '+';
        break;
      case 'subtract':
        result = input.a - input.b;
        symbol = '-';
        break;
      case 'multiply':
        result = input.a * input.b;
        symbol = '×';
        break;
      case 'divide':
        if (input.b === 0) {
          throw new Error('Cannot divide by zero');
        }
        result = input.a / input.b;
        symbol = '÷';
        break;
      default:
        throw new Error('Invalid operation');
    }

    return {
      operation: input.operation,
      a: input.a,
      b: input.b,
      result,
      expression: `${input.a} ${symbol} ${input.b} = ${result}`
    };
  }

  @Tool({
    name: 'convert_temperature',
    description: 'Convert temperature units based on file content or direct input. Supports Celsius (C) and Fahrenheit (F).',
    inputSchema: z.object({
      file_name: z
        .string()
        .max(100)
        .regex(/^[a-zA-Z0-9._-]+$/, 'Filename must contain only alphanumeric characters, dots, underscores, or hyphens')
        .optional()
        .describe('Name of the input file'),
      file_type: z
        .enum(['text/plain', 'text/csv', 'application/json'])
        .optional()
        .describe('MIME type of the uploaded file'),
      file_content: z
        .string()
        .max(2 * 1024 * 1024, 'File content cannot exceed 2MB')
        .optional()
        .describe('Base64 encoded file content'),
      value: z.number().finite().optional().describe('Temperature value to convert'),
      from_unit: z.enum(['C', 'F']).optional().describe('Unit to convert from (C or F)'),
      to_unit: z.enum(['C', 'F']).optional().describe('Unit to convert to (C or F)')
    })
  })
  async convertTemperature(input: any, ctx: ExecutionContext) {
    // Sanitize file_name to prevent path traversal or injection
    const rawFileName = typeof input.file_name === 'string' ? path.basename(input.file_name) : undefined;
    const safeFileName = rawFileName ? rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) : undefined;

    ctx.logger.info('Processing temperature conversion request', {
      fileName: safeFileName,
      fileType: input.file_type,
      value: input.value,
      from: input.from_unit,
      to: input.to_unit
    });

    let value = input.value;
    const fromUnit = input.from_unit;
    const toUnit = input.to_unit;

    // Secure in-memory file processing: parse file without host filesystem writes
    if (input.file_content) {
      try {
        const matches = input.file_content.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        const base64Data = matches && matches.length === 3 ? matches[2] : input.file_content;
        const decoded = Buffer.from(base64Data, 'base64').toString('utf-8');

        // Extract temperature value from file content if not directly provided
        if (value === undefined) {
          const numMatch = decoded.match(/(-?\d+(?:\.\d+)?)/);
          if (numMatch) {
            value = parseFloat(numMatch[1]);
          }
        }

        ctx.logger.info('Processed file payload safely in-memory', {
          fileName: safeFileName,
          sizeBytes: base64Data.length
        });
      } catch (e) {
        ctx.logger.warn('Failed to parse base64 file content', { error: e instanceof Error ? e.message : String(e) });
      }
    }

    const fileStats = safeFileName ? {
      name: safeFileName,
      type: input.file_type || 'text/plain',
      status: 'processed_in_memory'
    } : null;

    let result: number | null = null;
    let message = safeFileName
      ? `Successfully processed ${safeFileName} in memory.`
      : 'Conversion processed.';

    // Perform conversion logic
    if (value !== undefined && fromUnit && toUnit) {
      try {
        if (fromUnit === toUnit) {
          result = value;
        } else if (fromUnit === 'C' && toUnit === 'F') {
          result = (value * 9 / 5) + 32;
        } else if (fromUnit === 'F' && toUnit === 'C') {
          result = (value - 32) * 5 / 9;
        } else {
          throw new Error('Unsupported unit conversion');
        }

        if (result !== null) {
          result = Math.round(result * 100) / 100;
          message += ` Result: ${result}°${toUnit}`;
        }
      } catch (e: any) {
        message += ` Conversion failed: ${e.message}`;
      }
    } else {
      message += ' No valid conversion parameters detected from manual input or file extraction.';
    }

    return {
      status: 'success',
      message,
      file_info: fileStats,
      conversion_result: result !== null && toUnit ? { value: result, unit: toUnit } : null,
      original_value: value !== undefined && fromUnit ? { value, unit: fromUnit } : null
    };
  }
}
