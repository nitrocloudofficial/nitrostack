import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { PipelineService } from './pipeline.service.js';

const pipelineService = new PipelineService();

export class PipelineResources {
  @Resource({
    uri: 'aeios://pipeline/status',
    name: 'Pipeline Status',
    description: 'Current AEIOS-X Enterprise Pipeline execution status and statistics',
    mimeType: 'application/json',
  })
  async getStatus(uri: string, ctx: ExecutionContext) {
    const status = pipelineService.getStatus();
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
    description: 'AEIOS-X Enterprise Kernel health status for all services',
    mimeType: 'application/json',
  })
  async getHealth(uri: string, ctx: ExecutionContext) {
    await pipelineService.initialize();
    const kernelStatus = pipelineService.getKernelStatus();
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
  async getInfo(uri: string, ctx: ExecutionContext) {
    const info = {
      name: 'AEIOS-X',
      fullName: 'Autonomous Enterprise Intelligence Operating System',
      version: '1.0.0',
      framework: 'NitroStack MCP',
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
