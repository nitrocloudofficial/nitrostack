import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import * as fs from 'fs/promises';
import * as path from 'path';

const STOP_WORDS = new Set([
  "why", "was", "did", "we", "to", "the", "a", "an", "is", "for", "on", 
  "of", "in", "it", "with", "about", "our", "what", "who", "how", "from"
]);

export class DecisionTools {
  @Tool({
    name: 'discoverDecision',
    description: 'Search local enterprise decisions database for entries matching the user query.',
    inputSchema: z.object({
      query: z.string().describe("The search query (e.g. 'Vendor X rejected', 'AWS migration', or 'Feature Phoenix').")
    })
  })
  async discoverDecision(input: { query: string }, ctx: ExecutionContext) {
    ctx.logger.info('Searching for decisions', { query: input.query });
    
    const rawQuery = (input.query || "").trim();
    const queryLower = rawQuery.toLowerCase();
    
    try {
      // DATA_PATH is relative to the root directory where the process is running
      const dataPath = path.resolve(process.cwd(), '../enterprise-data.json');
      const rawData = await fs.readFile(dataPath, 'utf-8');
      const decisions = JSON.parse(rawData);

      if (!queryLower) {
        return JSON.stringify([], null, 2);
      }

      const results = decisions.filter((decision: any) => {
        const matchesFieldDirect = (fieldVal: any) => 
          String(fieldVal || "").toLowerCase().includes(queryLower);

        const directMatch = 
          matchesFieldDirect(decision.title) ||
          matchesFieldDirect(decision.decision) ||
          matchesFieldDirect(decision.reason) ||
          matchesFieldDirect(decision.department) ||
          decision.people.some(matchesFieldDirect) ||
          decision.evidence.some(matchesFieldDirect);

        if (directMatch) return true;

        const keywords = queryLower
          .split(/[\s,?.!/]+/)
          .filter((word) => word && !STOP_WORDS.has(word));

        if (keywords.length === 0) return false;

        const matchesKeyword = (fieldVal: any, keyword: string) => {
          const valStr = String(fieldVal || "").toLowerCase();
          if (keyword.length <= 2) {
            const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp('\\b' + escaped + '\\b', 'i');
            return regex.test(valStr);
          }
          return valStr.includes(keyword);
        };

        return keywords.some((keyword) => {
          return (
            matchesKeyword(decision.title, keyword) ||
            matchesKeyword(decision.decision, keyword) ||
            matchesKeyword(decision.reason, keyword) ||
            matchesKeyword(decision.department, keyword) ||
            decision.people.some((person: string) => matchesKeyword(person, keyword)) ||
            decision.evidence.some((item: string) => matchesKeyword(item, keyword))
          );
        });
      });

      return JSON.stringify(results, null, 2);
    } catch (error: any) {
      ctx.logger.error("Error reading or processing data source:", error);
      throw new Error(`Failed to query database: ${error.message}`);
    }
  }
}
