import fs from 'fs';
import { z } from 'zod';

export class JsonRepository<T extends { id: string }> {
  protected items: Map<string, T> = new Map();
  protected initialized: boolean = false;

  constructor(
    protected filePath: string,
    protected schema: z.ZodType<T>,
    protected extractArray: (data: any) => any[] = (data) => Array.isArray(data) ? data : []
  ) {}

  public load(): void {
    if (this.initialized) return;

    if (!fs.existsSync(this.filePath)) {
      throw new Error(`[Repository] Seed file not found at ${this.filePath}`);
    }

    const rawData = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
    const arrayData = this.extractArray(rawData);

    for (const item of arrayData) {
      // Validate strictly against Zod Schema on load
      const validItem = this.schema.parse(item);
      this.items.set(validItem.id, validItem);
    }

    this.initialized = true;
  }

  public getById(id: string): T | undefined {
    this.ensureInitialized();
    return this.items.get(id);
  }

  public getAll(): T[] {
    this.ensureInitialized();
    return Array.from(this.items.values());
  }

  public save(item: T): void {
    this.ensureInitialized();
    // Validate before saving to runtime copy
    const validItem = this.schema.parse(item);
    
    // Write goes to runtime map ONLY. Seed file is never mutated.
    this.items.set(validItem.id, validItem);
  }

  protected ensureInitialized(): void {
    if (!this.initialized) {
      this.load();
    }
  }
}
