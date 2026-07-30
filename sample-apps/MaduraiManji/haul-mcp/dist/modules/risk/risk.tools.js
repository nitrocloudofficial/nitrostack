var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ToolDecorator as Tool, z } from '@nitrostack/core';
import { db } from '../../db/database.js';
export class RiskTools {
    async analyzeRisk(input, ctx) {
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
        await new Promise((resolve, reject) => {
            db.run(`INSERT INTO risk_logs (dependency, status, risk_level, analysis, suggestion) VALUES (?, ?, ?, ?, ?)`, [input.dependency, input.status, result.riskLevel, result.analysis, result.suggestion], (err) => { if (err)
                reject(err);
            else
                resolve(); });
        });
        return { success: true, ...result, message: result.analysis + '\n\n' + result.suggestion + '\n\n— Haul makes life easier 🚀' };
    }
    async listRisks(_input, ctx) {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM risk_logs ORDER BY created_at DESC`, (err, rows) => {
                if (err)
                    return reject(err);
                if (!rows || rows.length === 0)
                    return resolve({ message: 'No risk logs found.\n\n— Haul makes life easier 🚀' });
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
__decorate([
    Tool({
        name: 'analyze_risk',
        description: `Use this when the user mentions something is delayed, blocked, stuck, or at risk of missing a deadline.
Examples: "authentication is delayed by 3 days", "the database migration is blocked", "we might miss the launch", "the API integration is stuck".
Calculates impact on launch and suggests corrective action.`,
        inputSchema: z.object({
            dependency: z.string().describe('The component, task, or feature that is delayed or at risk (e.g. "Authentication Module", "API Integration")'),
            status: z.string().describe('The current problem status (e.g. "delayed by 3 days", "blocked by external vendor", "developer is sick")')
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RiskTools.prototype, "analyzeRisk", null);
__decorate([
    Tool({
        name: 'list_risks',
        description: `Show all logged risk analyses. Use when the user asks "what are our current risks?", "show risk log", or "what's blocked?".`,
        inputSchema: z.object({})
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RiskTools.prototype, "listRisks", null);
