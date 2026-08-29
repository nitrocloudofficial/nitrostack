import { Injectable, ResourceDecorator as Resource } from '@nitrostack/core';
import { PipelineService } from './pipeline.service.js';

@Injectable()
export class PipelineResources {
  private pipelineService = new PipelineService();

  @Resource({
    uri: 'aeios://pipeline/status',
    name: 'Pipeline Status',
    description: 'Current AEIOS-X Enterprise Pipeline execution status, statistics, and backend connectivity',
    mimeType: 'application/json',
  })
  async getStatus(uri: string, ctx: any) {
    const status = await this.pipelineService.getStatus();
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(status, null, 2),
        },
      ],
    };
  }

  @Resource({
    uri: 'aeios://system/health',
    name: 'System Health',
    description: 'AEIOS-X Enterprise Kernel health status for all services including backend connectivity',
    mimeType: 'application/json',
  })
  async getHealth(uri: string, ctx: any) {
    await this.pipelineService.initialize();
    const kernelStatus = this.pipelineService.getKernelStatus();
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(kernelStatus, null, 2),
        },
      ],
    };
  }

  @Resource({
    uri: 'aeios://system/info',
    name: 'System Info',
    description: 'AEIOS-X system version, capabilities, and configuration',
    mimeType: 'application/json',
  })
  async getInfo(uri: string, ctx: any) {
    const status = await this.pipelineService.getStatus();
    const info = {
      name: 'AEIOS-X',
      fullName: 'Autonomous Enterprise Intelligence Operating System',
      version: '1.0.0',
      framework: 'NitroStack MCP',
      architecture: status.backendConnected ? 'two-tier (MCP → FastAPI)' : 'standalone (local pipeline)',
      capabilities: [
        'Multi-Agent AI Pipeline',
        'Dynamic Agent Creation',
        'Intent Detection (10 types)',
        'Enterprise Knowledge Management',
        'Consensus Engine',
        'Decision Engine',
        'Conflict Resolution',
        'Enterprise Response Synthesis',
      ],
      supportedIntents: [
        'GENERAL', 'MATH', 'CODING', 'RESEARCH', 'PLANNING',
        'BUSINESS', 'SECURITY', 'SQL', 'DATA_SCIENCE', 'DEVOPS', 'MCP',
      ],
      llm: {
        provider: 'Groq',
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      },
      backend: {
        url: process.env.AEIOS_BACKEND_URL || 'http://127.0.0.1:8000',
        connected: status.backendConnected,
      },
    };

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(info, null, 2),
        },
      ],
    };
  }
}
