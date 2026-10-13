import { Injectable } from '@nitrostack/core';
import { db } from '../../db/index.js';

@Injectable()
export class TodoService {
  constructor() {}

  async getPending() {
    const todos = await db.getTodos();
    return { tasks: todos.filter(t => !t.completed) };
  }

  async getTasksForDate(date: string) {
    const todos = await db.getTodos();
    const normalizedDate = new Date(date);
    if (Number.isNaN(normalizedDate.getTime())) {
      throw new Error(`Invalid date provided: ${date}`);
    }

    return {
      tasks: todos.filter(t => {
        if (!t.due) return false;
        return new Date(t.due).toDateString() === normalizedDate.toDateString();
      })
    };
  }

  async createTask(title: string, due?: string) {
    const id = Date.now().toString();
    let dueIso: string | undefined = undefined;
    if (due) {
      // If user passed YYYY-MM-DD, convert to ISO at midnight local time
      if (/^\d{4}-\d{2}-\d{2}$/.test(due)) {
        const d = new Date(due);
        dueIso = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      } else {
        const parsed = new Date(due);
        if (!Number.isNaN(parsed.getTime())) dueIso = parsed.toISOString();
        else dueIso = due; // fallback to raw string
      }
    }

    const task = { id, title, due: dueIso, completed: false };
    await db.saveTodo(task);
    return { success: true, task };
  }

  async completeTask(id: string) {
    const todos = await db.getTodos();
    const task = todos.find(t => t.id === id);
    if (task) {
      task.completed = true;
      await db.saveTodo(task);
    }
    return { success: true, id };
  }

  async updateTask(id: string, title?: string, due?: string) {
    const todos = await db.getTodos();
    const task = todos.find(t => t.id === id);
    if (task) {
      if (title !== undefined) task.title = title;
      if (due !== undefined) task.due = due;
      await db.saveTodo(task);
    }
    return { success: true, task };
  }

  async deleteTask(id: string) {
    await db.deleteTodo(id);
    return { success: true, id };
  }
}
