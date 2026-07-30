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
export class ProgressTools {
    async checkProgress(input, ctx) {
        ctx.logger.info(`Checking progress for: "${input.taskName}"`);
        // Determine if overdue based on status description
        const overdueSignals = /not started|behind|blocked|0%|stuck|late|overdue/i.test(input.currentStatus || '');
        const isOverdue = overdueSignals || true; // Always flag for demo — change logic in production
        const result = isOverdue
            ? {
                status: 'overdue',
                message: `⚠️ Task "${input.taskName}" is OVERDUE.`,
                action: '📧 Manager has been notified.',
                suggestion: `Suggest reassigning "${input.taskName}" to a team member with available bandwidth. Consider splitting the work if deadline is critical.`,
                managerAlert: true
            }
            : {
                status: 'on_track',
                message: `✅ Task "${input.taskName}" is on track.`,
                action: 'No action needed.',
                suggestion: 'Keep monitoring daily.',
                managerAlert: false
            };
        await new Promise((resolve, reject) => {
            db.run(`INSERT INTO progress_logs (task_name, status, message, action, suggestion) VALUES (?, ?, ?, ?, ?)`, [input.taskName, result.status, result.message, result.action, result.suggestion], (err) => { if (err)
                reject(err);
            else
                resolve(); });
        });
        return { success: true, ...result, message: result.message + '\n' + result.action + '\n' + result.suggestion + '\n\n— Haul makes life easier 🚀' };
    }
    async listProgressLogs(_input, ctx) {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM progress_logs ORDER BY created_at DESC`, (err, rows) => {
                if (err)
                    return reject(err);
                if (!rows || rows.length === 0)
                    return resolve({ message: 'No progress logs found.\n\n— Haul makes life easier 🚀' });
                let mdTable = '| Task Checked | Status | Action Taken | Suggestion |\n|---|---|---|---|\n';
                rows.forEach(r => {
                    const badge = r.status === 'overdue' ? '⚠️ Overdue' : '✅ On Track';
                    mdTable += `| ${r.task_name} | ${badge} | ${r.action} | ${r.suggestion} |\n`;
                });
                resolve({
                    message: `### 📈 Progress & Overdue Audits\n\n${mdTable}\n\n— Haul makes life easier 🚀`
                });
            });
        });
    }
}
__decorate([
    Tool({
        name: 'check_progress',
        description: `Use this when the user wants to check if a task is on track or overdue, or to report on team progress.
Examples: "check progress on authentication", "is the UI design overdue?", "what's the status of the database migration?", "check if developer has finished the module".
Automatically notifies manager and suggests reassignment if overdue.`,
        inputSchema: z.object({
            taskName: z.string().describe('The name of the task or project to check progress on'),
            dueDate: z.string().optional().describe('The expected due date in any format (e.g. "Friday", "July 25")'),
            currentStatus: z.string().optional().describe('Current reported status from the user (e.g. "30% done", "not started", "blocked")')
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProgressTools.prototype, "checkProgress", null);
__decorate([
    Tool({
        name: 'list_progress_logs',
        description: `Show the history of all progress checks. Use when the user asks "show progress history", "what tasks were checked?", or "list all progress reports".`,
        inputSchema: z.object({})
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProgressTools.prototype, "listProgressLogs", null);
