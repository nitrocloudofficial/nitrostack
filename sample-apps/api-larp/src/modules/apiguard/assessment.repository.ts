import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import { Injectable } from '@nitrostack/core';
import type { Assessment } from '../../domain/types.js';

const assessmentSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  analysisStatus: z.string(),
  decisionStatus: z.string(),
  version: z.number()
}).passthrough();

@Injectable()
export class AssessmentRepository {
  private readonly memoryStore = new Map<string, Assessment>();

  private filePath(id: string): string {
    return resolve(process.cwd(), '.apiguard', 'assessments', `${id}.json`);
  }

  private persist(assessment: Assessment): void {
    try {
      const file = this.filePath(assessment.id);
      const dir = dirname(file);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const tmp = `${file}.tmp`;
      writeFileSync(tmp, JSON.stringify(assessment, null, 2), 'utf8');
      renameSync(tmp, file);
    } catch (err) {
      throw new Error(`[AssessmentRepository] Failed to persist assessment: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  create(assessment: Assessment): Assessment {
    const clone = structuredClone(assessment);
    this.memoryStore.set(assessment.id, clone);
    this.persist(clone);
    return structuredClone(clone);
  }

  get(id: string): Assessment | undefined {
    const cached = this.memoryStore.get(id);
    if (cached) return structuredClone(cached);

    try {
      const file = this.filePath(id);
      if (!existsSync(file)) return undefined;
      const raw = readFileSync(file, 'utf8');
      const parsed = JSON.parse(raw);
      const validated = assessmentSchema.parse(parsed) as unknown as Assessment;
      this.memoryStore.set(id, validated);
      return structuredClone(validated);
    } catch (err) {
      console.error(`[AssessmentRepository] Failed to load assessment ${id}:`, err);
      return undefined;
    }
  }

  update(assessment: Assessment): Assessment {
    if (!this.get(assessment.id)) {
      throw new Error(`Assessment ${assessment.id} does not exist.`);
    }
    const clone = structuredClone(assessment);
    this.memoryStore.set(assessment.id, clone);
    this.persist(clone);
    return structuredClone(clone);
  }
}
