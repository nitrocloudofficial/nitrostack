import { Injectable } from '@nitrostack/core';
import { diffOpenApi } from '../../domain/openapi-diff.js';
import type { ApiChange, ScenarioSpecs } from '../../domain/types.js';

@Injectable()
export class DiffService {
  diff(specs: ScenarioSpecs): ApiChange[] {
    return diffOpenApi(specs.baseline, specs.candidate);
  }
}
