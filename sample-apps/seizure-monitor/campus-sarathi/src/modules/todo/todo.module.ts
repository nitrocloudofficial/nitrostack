import { Module } from '@nitrostack/core';
import { TodoTools } from './todo.tools.js';
import { TodoService } from './todo.service.js';

@Module({
  name: 'todo',
  description: 'Google Tasks integration',
  controllers: [TodoTools],
  providers: [TodoService],
  imports: [],
  exports: [TodoService]
})
export class TodoModule {}
