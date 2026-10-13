import { 
  ControllerDecorator as Controller, 
  ToolDecorator as Tool, 
  z, 
  ExecutionContext 
} from '@nitrostack/core';

@Controller()
export class AppController {
  @Tool({
    name: 'hello',
    description: 'Say hello to someone',
    inputSchema: z.object({
      name: z.string().describe('The name to greet'),
    }),
  })
  async hello(input: { name: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Greeting ${input.name}`);
    return `Hello, ${input.name}! 👋`;
  }
}
