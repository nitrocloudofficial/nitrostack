export class StateManager {
  private state = new Map<string, unknown>();
  private snapshots: Array<Map<string, unknown>> = [];

  get<T = unknown>(key: string): T | undefined {
    return this.state.get(key) as T | undefined;
  }

  set(key: string, value: unknown): void {
    this.state.set(key, value);
  }

  delete(key: string): boolean {
    return this.state.delete(key);
  }

  has(key: string): boolean {
    return this.state.has(key);
  }

  snapshot(): number {
    this.snapshots.push(new Map(this.state));
    return this.snapshots.length - 1;
  }

  restore(index: number): boolean {
    if (index < 0 || index >= this.snapshots.length) return false;
    this.state = new Map(this.snapshots[index]!);
    return true;
  }

  getAll(): Record<string, unknown> {
    return Object.fromEntries(this.state);
  }

  clear(): void {
    this.state.clear();
  }
}
