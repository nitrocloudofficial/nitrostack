import { readFileSync } from 'fs';
import { join } from 'path';
import { WasteStream, Factory } from './types.js';

export interface CompatibilityRule {
  sourceCategory: string;
  sourceForm: string;
  targetIndustry: string;
  targetInput: string;
  compatibilityScore: number;
  notes: string;
}

export class CompatibilityMatrix {
  private rules: CompatibilityRule[] = [];

  constructor() {
    try {
      const matrixPath = join(process.cwd(), 'src/data/compatibility-matrix.json');
      const data = JSON.parse(readFileSync(matrixPath, 'utf-8'));
      this.rules = data.rules || [];
    } catch (e) {
      this.rules = [];
    }
  }

  public getCompatibility(waste: WasteStream, targetFactory: Factory): { score: number; notes: string } | null {
    // Find a rule that matches waste category, form, and target industry
    const rule = this.rules.find(
      r =>
        r.sourceCategory === waste.category &&
        r.sourceForm === waste.physicalForm &&
        r.targetIndustry === targetFactory.industryType
    );

    if (rule) {
      return {
        score: rule.compatibilityScore,
        notes: rule.notes
      };
    }

    // Generic fallback matching
    if (waste.category === 'cellulosic' && targetFactory.industryType === 'Paper Manufacturing') {
      return {
        score: 60,
        notes: 'Cellulosic waste can potentially be repulped for paper manufacturing.'
      };
    }

    if (waste.category === 'metallic' && targetFactory.industryType === 'Metal Casting') {
      return {
        score: 75,
        notes: 'Metallic waste can potentially be remelted in metal casting.'
      };
    }

    return null;
  }
}
