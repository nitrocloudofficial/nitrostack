import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { db } from '../../db/database.js';

export class RiskTools {
  @Tool({
    name: 'analyze_risk',
    description: `Use this when the user mentions something is delayed, blocked, stuck, or at risk of missing a deadline.
Examples: "authentication is delayed by 3 days", "the database migration is blocked", "we might miss the launch", "the API integration is stuck".
Calculates impact on launch and suggests corrective action.`,
    inputSchema: z.object({
      dependency: z.string().describe('The component, task, or feature that is delayed or at risk (e.g. "Authentication Module", "API Integration")'),
      status: z.string().describe('The current problem status (e.g. "delayed by 3 days", "blocked by external vendor", "developer is sick")')
    })
  })
  async analyzeRisk(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Analyzing risk for: "${input.dependency}" — status: "${input.status}"`);

    const isHighRisk = /delay|block|stuck|miss|late|behind|overdue|sick/i.test(input.status);

    const result = isHighRisk
      ? {
          riskLevel: 'High',
          analysis: `⚠️ "${input.dependency}" is at HIGH risk. Status: ${input.status}. Estimated launch delay: 3–5 days.`,
          suggestion: `Immediately assign another developer to pair on "${input.dependency}". Consider descoping non-critical features to protect the launch date.`,
          impact: 'Launch timeline likely impacted.'
        }
      : {
          riskLevel: 'Low',
          analysis: `✅ "${input.dependency}" shows low risk. Status: ${input.status}.`,
          suggestion: 'No immediate action needed. Continue monitoring.',
          impact: 'No significant launch impact.'
        };

    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO risk_logs (dependency, status, risk_level, analysis, suggestion) VALUES (?, ?, ?, ?, ?)`,
        [input.dependency, input.status, result.riskLevel, result.analysis, result.suggestion],
        (err: Error | null) => { if (err) reject(err); else resolve(); }
      );
    });

    return { success: true, ...result, message: result.analysis + '\n\n' + result.suggestion + '\n\n— Haul makes life easier 🚀' };
  }

  @Tool({
    name: 'list_risks',
    description: `Show all logged risk analyses. Use when the user asks "what are our current risks?", "show risk log", or "what's blocked?".`,
    inputSchema: z.object({})
  })
  async listRisks(_input: any, ctx: ExecutionContext) {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM risk_logs ORDER BY created_at DESC`, (err: Error | null, rows: any[]) => {
        if (err) return reject(err);
        if (!rows || rows.length === 0) return resolve({ message: 'No risk logs found.\n\n— Haul makes life easier 🚀' });

        let mdTable = '| Risk Level | Dependency | Status / Bottleneck | Recommendation |\n|---|---|---|---|\n';
        rows.forEach(r => {
          const badge = r.risk_level === 'High' ? '⚠️ High' : '✅ Low';
          mdTable += `| ${badge} | ${r.dependency} | ${r.status} | ${r.suggestion} |\n`;
        });

        resolve({
          message: `### ⚠️ Identified Risks & Blockers\n\n${mdTable}\n\n— Haul makes life easier 🚀`
        });
      });
    });
  }
}
