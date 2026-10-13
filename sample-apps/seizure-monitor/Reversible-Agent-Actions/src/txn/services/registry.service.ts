import 'reflect-metadata';
import { Injectable } from '@nitrostack/core';
import type { CompensatorSpec, ReversibilityClass } from '../types.js';
import { COMPENSATABLE_META } from '../decorators/compensatable.decorator.js';

/** Central registry mapping tool names to their compensator specs. */
@Injectable()
export class CompensatorRegistry {
  private specs = new Map<string, CompensatorSpec>();

  /** Registers a compensator spec for a tool name, called at module init. */
  register(toolName: string, spec: Omit<CompensatorSpec, 'toolName'>): void {
    this.specs.set(toolName, { toolName, ...spec });
  }

  /**
   * Scans a tools class's prototype for methods carrying @Compensatable metadata
   * and registers each one under its method name. Called by the DI system at boot.
   */
  registerFromClass(toolsClass: any): void {
    const prototype = toolsClass?.prototype;
    if (!prototype) return;

    for (const propertyName of Object.getOwnPropertyNames(prototype)) {
      const method = prototype[propertyName];
      if (typeof method !== 'function') continue;

      const spec = Reflect.getMetadata(COMPENSATABLE_META, method) as
        | Omit<CompensatorSpec, 'toolName'>
        | undefined;
      if (spec) {
        this.register(propertyName, spec);
      }
    }
  }

  /** Returns the spec for a tool name, or null if unregistered. Null means TERMINAL — never throws. */
  lookup(toolName: string): CompensatorSpec | null {
    return this.specs.get(toolName) ?? null;
  }

  /** Returns all registered specs. */
  all(): CompensatorSpec[] {
    return Array.from(this.specs.values());
  }

  /** Aggregates registry-wide reversibility coverage for the @Resource endpoint and widget summary bar. */
  coverage(): { total: number; reversible: number; terminal: number; byClass: Record<ReversibilityClass, number> } {
    const byClass: Record<ReversibilityClass, number> = {
      CLEAN: 0,
      RESTORATIVE: 0,
      TOMBSTONED: 0,
      MITIGABLE: 0,
      TERMINAL: 0,
    };

    for (const spec of this.specs.values()) {
      byClass[spec.baseClass]++;
    }

    const total = this.specs.size;
    const terminal = byClass.TERMINAL;
    return { total, reversible: total - terminal, terminal, byClass };
  }

  /** Whether a tool name has a registered compensator spec. */
  isRegistered(toolName: string): boolean {
    return this.specs.has(toolName);
  }
}
