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
const ALLOWED_TABLES = {
    tasks: 'tasks',
    calendar: 'calendar_events',
    risk: 'risk_logs',
    progress: 'progress_logs',
};
export class DbProxyTools {
    async getAgentLogs(input, ctx) {
        const tableName = ALLOWED_TABLES[input.agent];
        if (!tableName) {
            return { error: 'Unknown agent', rows: [] };
        }
        return new Promise((resolve) => {
            db.all(`SELECT * FROM ${tableName} ORDER BY created_at DESC`, (err, rows) => {
                if (err) {
                    ctx.logger.error(`DB error: ${err.message}`);
                    resolve({ error: err.message, rows: [] });
                }
                else {
                    resolve({ rows: rows ?? [] });
                }
            });
        });
    }
    async getAgentCounts(_input, ctx) {
        const tables = Object.entries(ALLOWED_TABLES);
        const counts = {};
        for (const [key, table] of tables) {
            await new Promise((resolve) => {
                db.get(`SELECT COUNT(*) as cnt FROM ${table}`, (err, row) => {
                    counts[key] = err ? 0 : (row?.cnt ?? 0);
                    resolve();
                });
            });
        }
        return counts;
    }
}
__decorate([
    Tool({
        name: 'get_agent_logs',
        description: 'Returns all stored records for a given agent type from the database. Used by the frontend to display real-time data.',
        inputSchema: z.object({
            agent: z.enum(['tasks', 'calendar', 'risk', 'progress'])
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DbProxyTools.prototype, "getAgentLogs", null);
__decorate([
    Tool({
        name: 'get_agent_counts',
        description: 'Returns the record count for all 4 agent tables. Used by the frontend home page to show live session counts.',
        inputSchema: z.object({})
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DbProxyTools.prototype, "getAgentCounts", null);
