import { ToolDecorator as Tool, z } from '@nitrostack/core';
class X { @Tool({ name: 'x', description: 'y', inputSchema: z.object({}) }) m() {} }
