import { ResourceDecorator as Resource, Widget, ExecutionContext } from '@nitrostack/core';

export class CalculatorResources {
  @Resource({
    uri: 'calculator://operations',
    name: 'Calculator Operations',
    description: 'List of available calculator operations',
    mimeType: 'application/json',
    examples: {
      response: {
        operations: [
          { name: 'add', symbol: '+', description: 'Addition' },
          { name: 'subtract', symbol: '-', description: 'Subtraction' },
          { name: 'multiply', symbol: '×', description: 'Multiplication' },
          { name: 'divide', symbol: '÷', description: 'Division' }
        ]
      }
    }
  })
  async getOperations(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching calculator operations');

    const operations = [
      {
        name: 'add',
        symbol: '+',
        description: 'Addition',
        example: '5 + 3 = 8'
      },
      {
        name: 'subtract',
        symbol: '-',
        description: 'Subtraction',
        example: '10 - 4 = 6'
      },
      {
        name: 'multiply',
        symbol: '×',
        description: 'Multiplication',
        example: '6 × 7 = 42'
      },
      {
        name: 'divide',
        symbol: '÷',
        description: 'Division',
        example: '20 ÷ 5 = 4'
      }
    ];

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ operations }, null, 2)
      }]
    };
  }
}

