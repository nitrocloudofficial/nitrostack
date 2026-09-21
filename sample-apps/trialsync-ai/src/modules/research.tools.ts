import { Module, ToolDecorator as Tool, z } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

@Module({
  name: 'ResearchModule',
})
export class ResearchTools {
  @Tool({
    name: 'search_clinical_trials',
    description: 'Searches ClinicalTrials.gov or loads fallback dataset for trial matching',
    inputSchema: z.object({
      disease: z.string().describe('The primary disease or condition to search for'),
    }),
  })
  async searchTrials(input: { disease: string }) {
    try {
      const url = `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(input.disease)}&pageSize=5`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API fetch failed with status ${response.status}`);
      }

      const data = await response.json();
      return { source: 'live_api', trials: data.studies };
    } catch (error) {
      const fallbackPath = path.join(process.cwd(), 'datasets', 'sample_trials.json');
      const fileData = fs.readFileSync(fallbackPath, 'utf-8');
      const sampleTrials = JSON.parse(fileData);

      const filteredTrials = sampleTrials.filter((trial: any) =>
        trial.disease.toLowerCase().includes(input.disease.toLowerCase())
      );

      return {
        source: 'local_fallback',
        trials: filteredTrials.length > 0 ? filteredTrials : sampleTrials,
      };
    }
  }
}