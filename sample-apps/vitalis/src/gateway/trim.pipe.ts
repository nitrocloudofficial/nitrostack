/**
 * TrimPipe — Normalizes and trims all string inputs recursively.
 */
import { Pipe, PipeInterface, ArgumentMetadata, Injectable } from '@nitrostack/core';

@Pipe()
@Injectable()
export class TrimPipe implements PipeInterface<unknown, unknown> {
  async transform(value: unknown, _metadata: ArgumentMetadata): Promise<unknown> {
    return this.trimValue(value);
  }

  private trimValue(val: any): any {
    if (val === null || val === undefined) return val;
    if (typeof val === 'string') return val.trim();
    if (Array.isArray(val)) return val.map((item) => this.trimValue(item));
    if (typeof val === 'object') {
      const obj: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) {
        obj[k] = this.trimValue(v);
      }
      return obj;
    }
    return val;
  }
}
