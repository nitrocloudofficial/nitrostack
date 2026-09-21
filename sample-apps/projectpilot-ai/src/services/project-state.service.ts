import { Injectable } from '@nitrostack/core';
import type { ProjectContext } from '../domain/schemas.js';

@Injectable()
export class ProjectStateService {
  private readonly store = new Map<string, ProjectContext>();

  public get(id: string): ProjectContext | undefined {
    return this.store.get(id);
  }

  public set(id: string, context: ProjectContext): void {
    this.store.set(id, context);
  }

  public has(id: string): boolean {
    return this.store.has(id);
  }

  public update(id: string, mutator: (ctx: ProjectContext) => void): ProjectContext {
    const ctx = this.store.get(id);
    if (!ctx) {
      throw new Error(`ProjectContext with ID ${id} does not exist`);
    }
    mutator(ctx);
    this.store.set(id, ctx);
    return ctx;
  }
}