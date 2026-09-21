import { Module } from '@nitrostack/core';
import { WardCopilotService } from './ward-copilot.service.js';
import { WardCopilotTools } from './ward-copilot.tools.js';

@Module({
    name: 'ward-copilot',
    description: 'Ward Copilot Healthcare MCP Module',
    controllers: [WardCopilotTools],
    providers: [WardCopilotService],
})
export class WardCopilotModule { }
