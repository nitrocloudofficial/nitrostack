import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Injectable } from '@nitrostack/core';
import { sha256 } from '../../domain/hash.js';
import type { ScenarioSpecs } from '../../domain/types.js';
import { ApiGuardConfig } from './config.service.js';

export interface RegisterContractInput {
  scenarioId?: string;
  baselineSpec?: Record<string, unknown> | string;
  candidateSpec?: Record<string, unknown> | string;
  baselineUrl?: string;
  candidateUrl?: string;
}

export interface RegisterContractResult {
  scenarioId: string;
  sourceType: 'INLINE' | 'URL';
  baselineSpecHash: string;
  candidateSpecHash: string;
  operationCountBaseline: number;
  operationCountCandidate: number;
  createdAt: string;
  resourceUris: {
    baseline: string;
    candidate: string;
  };
}

function parseJson(input: unknown, name: string): Record<string, unknown> {
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`Expected JSON object string for ${name}`);
      }
      return parsed as Record<string, unknown>;
    } catch (err) {
      throw new Error(`Failed to parse ${name} JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  throw new Error(`Invalid ${name}: expected a JSON object or string`);
}

function countOperations(spec: Record<string, unknown>): number {
  let count = 0;
  const paths = spec.paths;
  if (paths && typeof paths === 'object') {
    for (const pathObj of Object.values(paths as Record<string, unknown>)) {
      if (pathObj && typeof pathObj === 'object') {
        for (const method of Object.keys(pathObj as Record<string, unknown>)) {
          if (['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method.toLowerCase())) {
            count++;
          }
        }
      }
    }
  }
  return count;
}

@Injectable({ deps: [ApiGuardConfig] })
export class ContractService {
  constructor(private readonly config: ApiGuardConfig) {}

  async register(input: RegisterContractInput): Promise<RegisterContractResult> {
    let baselineObj: Record<string, unknown>;
    let candidateObj: Record<string, unknown>;
    let sourceType: 'INLINE' | 'URL' = 'INLINE';

    if (input.baselineUrl && input.candidateUrl) {
      sourceType = 'URL';
      const [bRes, cRes] = await Promise.all([
        fetch(input.baselineUrl, { headers: { Accept: 'application/json' } }),
        fetch(input.candidateUrl, { headers: { Accept: 'application/json' } })
      ]);
      if (!bRes.ok) throw new Error(`Failed to fetch baseline URL ${input.baselineUrl}: ${bRes.status}`);
      if (!cRes.ok) throw new Error(`Failed to fetch candidate URL ${input.candidateUrl}: ${cRes.status}`);
      baselineObj = parseJson(await bRes.text(), 'baselineUrl');
      candidateObj = parseJson(await cRes.text(), 'candidateUrl');
    } else {
      baselineObj = parseJson(input.baselineSpec, 'baselineSpec');
      candidateObj = parseJson(input.candidateSpec, 'candidateSpec');
    }

    const baselineHash = sha256(baselineObj);
    const candidateHash = sha256(candidateObj);

    const derivedId = input.scenarioId && /^[a-z0-9_-]+$/i.test(input.scenarioId)
      ? input.scenarioId
      : `scen_${sha256([baselineHash, candidateHash]).slice(0, 10)}`;

    const dir = path.resolve(process.cwd(), '.apiguard', 'scenarios', derivedId);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    writeFileSync(path.join(dir, 'baseline.openapi.json'), JSON.stringify(baselineObj, null, 2), 'utf8');
    writeFileSync(path.join(dir, 'candidate.openapi.json'), JSON.stringify(candidateObj, null, 2), 'utf8');

    return {
      scenarioId: derivedId,
      sourceType,
      baselineSpecHash: baselineHash,
      candidateSpecHash: candidateHash,
      operationCountBaseline: countOperations(baselineObj),
      operationCountCandidate: countOperations(candidateObj),
      createdAt: new Date().toISOString(),
      resourceUris: {
        baseline: `apiguard://scenarios/${derivedId}/specs/baseline`,
        candidate: `apiguard://scenarios/${derivedId}/specs/candidate`
      }
    };
  }
}
