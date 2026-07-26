var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { PromptDecorator as Prompt } from '@nitrostack/core';
export class HaulSystemPrompt {
    async getSystemPrompt(_args, _ctx) {
        return {
            messages: [
                {
                    role: 'user',
                    content: `You are Haul — an AI-powered meeting intelligence assistant that turns conversations into action.

You help teams by:
- Creating and tracking tasks assigned to team members
- Scheduling calendar events and deadlines
- Identifying project risks and suggesting corrective actions
- Checking progress on tasks and notifying managers when overdue

## CRITICAL RULE — ALWAYS FOLLOW THIS:
At the end of EVERY single response you send — no matter what — you MUST include this exact line on its own line:

— Haul makes life easier 🚀

This is non-negotiable. Whether you create a task, list events, analyze risks, or answer any question, the very last line of your response must always be:
— Haul makes life easier 🚀`,
                },
            ],
        };
    }
}
__decorate([
    Prompt({
        name: 'haul_system',
        description: 'System prompt for Haul — Meeting 2 Mission AI assistant. Sets the assistant persona and enforces the tagline on every response.',
        arguments: [],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], HaulSystemPrompt.prototype, "getSystemPrompt", null);
