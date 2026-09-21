import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class CalculatorPrompts {
  @Prompt({
    name: 'calculator_help',
    description: 'Get help with calculator operations',
    arguments: [
      {
        name: 'operation',
        description: 'The operation to get help with (optional)',
        required: false
      }
    ]
  })
  async getHelp(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating calculator help prompt');

    const operation = args.operation;

    if (operation) {
      // Help for specific operation
      const helpText = this.getOperationHelp(operation);
      return [
        {
          role: 'user' as const,
          content: `How do I use the ${operation} operation in the calculator?`
        },
        {
          role: 'assistant' as const,
          content: helpText
        }
      ];
    }

    // General help
    return [
      {
        role: 'user' as const,
        content: 'How do I use the calculator?'
      },
      {
        role: 'assistant' as const,
        content: `The calculator supports four basic operations:

1. **Addition** - Add two numbers together
   Example: calculate(operation="add", a=5, b=3) = 8

2. **Subtraction** - Subtract one number from another
   Example: calculate(operation="subtract", a=10, b=4) = 6

3. **Multiplication** - Multiply two numbers
   Example: calculate(operation="multiply", a=6, b=7) = 42

4. **Division** - Divide one number by another
   Example: calculate(operation="divide", a=20, b=5) = 4

Just call the 'calculate' tool with the operation and two numbers!`
      }
    ];
  }

  private getOperationHelp(operation: string): string {
    const helps: Record<string, string> = {
      add: 'Use addition to sum two numbers. Call calculate(operation="add", a=5, b=3) to get 8.',
      subtract: 'Use subtraction to find the difference. Call calculate(operation="subtract", a=10, b=4) to get 6.',
      multiply: 'Use multiplication to find the product. Call calculate(operation="multiply", a=6, b=7) to get 42.',
      divide: 'Use division to find the quotient. Call calculate(operation="divide", a=20, b=5) to get 4. Note: Cannot divide by zero!'
    };

    return helps[operation] || 'Unknown operation. Available operations: add, subtract, multiply, divide.';
  }
}

