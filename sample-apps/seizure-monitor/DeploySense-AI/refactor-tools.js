import fs from 'fs';
import path from 'path';

const files = {
  'github.tools.ts': `import { z } from 'zod';
import { ControllerDecorator as Controller } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { GithubService } from './github.service.js';

@Controller()
export class GithubTools {
  constructor(private readonly githubService: GithubService) {}

  @Tool({
    name: 'github',
    description: 'Perform GitHub operations',
    inputSchema: z.object({
      action: z.enum(['getRecentCommits', 'getCommitDetails', 'getChangedFiles']),
      hash: z.string().optional()
    })
  })
  async execute(args: { action: string, hash?: string }) {
    switch(args.action) {
      case 'getRecentCommits': return { success: true, data: this.githubService.getRecentCommits() };
      case 'getCommitDetails': return { success: true, data: this.githubService.getCommitDetails(args.hash!) };
      case 'getChangedFiles': return { success: true, data: this.githubService.getChangedFiles() };
      default: throw new Error('Unknown action');
    }
  }
}
`,
  'kubernetes.tools.ts': `import { z } from 'zod';
import { ControllerDecorator as Controller } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { KubernetesService } from './kubernetes.service.js';

@Controller()
export class KubernetesTools {
  constructor(private readonly kubernetesService: KubernetesService) {}

  @Tool({
    name: 'kubernetes',
    description: 'Perform Kubernetes operations',
    inputSchema: z.object({
      action: z.enum(['getPodStatus', 'getDeploymentStatus', 'getRestartCount']),
      podName: z.string().optional(),
      deploymentName: z.string().optional()
    })
  })
  async execute(args: { action: string, podName?: string, deploymentName?: string }) {
    switch(args.action) {
      case 'getPodStatus': return { success: true, data: this.kubernetesService.getPodStatus(args.podName!) };
      case 'getDeploymentStatus': return { success: true, data: this.kubernetesService.getDeploymentStatus(args.deploymentName!) };
      case 'getRestartCount': return { success: true, data: this.kubernetesService.getRestartCount(args.podName!) };
      default: throw new Error('Unknown action');
    }
  }
}
`,
  'logs.tools.ts': `import { z } from 'zod';
import { ControllerDecorator as Controller } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { LogsService } from './logs.service.js';

@Controller()
export class LogsTools {
  constructor(private readonly logsService: LogsService) {}

  @Tool({
    name: 'logs',
    description: 'Perform Log operations',
    inputSchema: z.object({
      action: z.enum(['searchLogs', 'latestErrors', 'getServiceLogs']),
      query: z.string().optional(),
      serviceName: z.string().optional()
    })
  })
  async execute(args: { action: string, query?: string, serviceName?: string }) {
    switch(args.action) {
      case 'searchLogs': return { success: true, data: this.logsService.searchLogs(args.query!) };
      case 'latestErrors': return { success: true, data: this.logsService.latestErrors() };
      case 'getServiceLogs': return { success: true, data: this.logsService.getServiceLogs(args.serviceName!) };
      default: throw new Error('Unknown action');
    }
  }
}
`,
  'metrics.tools.ts': `import { z } from 'zod';
import { ControllerDecorator as Controller } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { MetricsService } from './metrics.service.js';

@Controller()
export class MetricsTools {
  constructor(private readonly metricsService: MetricsService) {}

  @Tool({
    name: 'metrics',
    description: 'Perform Metrics operations',
    inputSchema: z.object({
      action: z.enum(['getCpuUsage', 'getMemoryUsage', 'getErrorRate', 'getResponseTime']),
      serviceName: z.string().optional()
    })
  })
  async execute(args: { action: string, serviceName?: string }) {
    switch(args.action) {
      case 'getCpuUsage': return { success: true, data: this.metricsService.getCpuUsage(args.serviceName!) };
      case 'getMemoryUsage': return { success: true, data: this.metricsService.getMemoryUsage(args.serviceName!) };
      case 'getErrorRate': return { success: true, data: this.metricsService.getErrorRate() };
      case 'getResponseTime': return { success: true, data: this.metricsService.getResponseTime() };
      default: throw new Error('Unknown action');
    }
  }
}
`,
  'jira.tools.ts': `import { z } from 'zod';
import { ControllerDecorator as Controller } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { JiraService } from './jira.service.js';

@Controller()
export class JiraTools {
  constructor(private readonly jiraService: JiraService) {}

  @Tool({
    name: 'jira',
    description: 'Perform Jira operations',
    inputSchema: z.object({
      action: z.enum(['createIncidentTicket', 'updateIncidentTicket']),
      title: z.string().optional(),
      description: z.string().optional(),
      severity: z.string().optional(),
      ticketId: z.string().optional(),
      status: z.string().optional(),
      comment: z.string().optional()
    })
  })
  async execute(args: { action: string, title?: string, description?: string, severity?: string, ticketId?: string, status?: string, comment?: string }) {
    switch(args.action) {
      case 'createIncidentTicket': return { success: true, data: this.jiraService.createIncidentTicket(args.title!, args.description!, args.severity!) };
      case 'updateIncidentTicket': return { success: true, data: this.jiraService.updateIncidentTicket(args.ticketId!, args.status!, args.comment!) };
      default: throw new Error('Unknown action');
    }
  }
}
`,
  'slack.tools.ts': `import { z } from 'zod';
import { ControllerDecorator as Controller } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { SlackService } from './slack.service.js';

@Controller()
export class SlackTools {
  constructor(private readonly slackService: SlackService) {}

  @Tool({
    name: 'slack',
    description: 'Perform Slack operations',
    inputSchema: z.object({
      action: z.enum(['sendIncidentAlert', 'sendResolutionMessage']),
      channel: z.string().optional(),
      message: z.string().optional(),
      severity: z.string().optional(),
      incidentId: z.string().optional()
    })
  })
  async execute(args: { action: string, channel?: string, message?: string, severity?: string, incidentId?: string }) {
    switch(args.action) {
      case 'sendIncidentAlert': return { success: true, data: this.slackService.sendIncidentAlert(args.channel!, args.message!, args.severity!) };
      case 'sendResolutionMessage': return { success: true, data: this.slackService.sendResolutionMessage(args.channel!, args.incidentId!, args.message!) };
      default: throw new Error('Unknown action');
    }
  }
}
`,
  'report.tools.ts': `import { z } from 'zod';
import { ControllerDecorator as Controller } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { ReportService } from './report.service.js';

@Controller()
export class ReportTools {
  constructor(private readonly reportService: ReportService) {}

  @Tool({
    name: 'report',
    description: 'Perform Report operations',
    inputSchema: z.object({
      action: z.enum(['generateIncidentSummary', 'getRootCauseAnalysis', 'getEvidenceTimeline', 'getRecommendedActions', 'getResolutionStatus']),
      incidentId: z.string().optional()
    })
  })
  async execute(args: { action: string, incidentId?: string }) {
    switch(args.action) {
      case 'generateIncidentSummary': return { success: true, data: this.reportService.generateIncidentSummary(args.incidentId!) };
      case 'getRootCauseAnalysis': return { success: true, data: this.reportService.getRootCauseAnalysis(args.incidentId!) };
      case 'getEvidenceTimeline': return { success: true, data: this.reportService.getEvidenceTimeline(args.incidentId!) };
      case 'getRecommendedActions': return { success: true, data: this.reportService.getRecommendedActions(args.incidentId!) };
      case 'getResolutionStatus': return { success: true, data: this.reportService.getResolutionStatus(args.incidentId!) };
      default: throw new Error('Unknown action');
    }
  }
}
`,
  'investigation.tools.ts': `import { z } from 'zod';
import { ControllerDecorator as Controller } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { InvestigationService } from './investigation.service.js';

@Controller()
export class InvestigationTools {
  constructor(private readonly investigationService: InvestigationService) {}

  @Tool({
    name: 'investigation',
    description: 'Perform Investigation operations',
    inputSchema: z.object({
      action: z.enum(['investigateIncident']),
      incidentId: z.string()
    })
  })
  async execute(args: { action: string, incidentId: string }) {
    switch(args.action) {
      case 'investigateIncident': return { success: true, data: await this.investigationService.investigateIncident(args.incidentId) };
      default: throw new Error('Unknown action');
    }
  }
}
`
};

for (const [filename, content] of Object.entries(files)) {
  const moduleName = filename.split('.')[0];
  const filepath = path.join(process.cwd(), 'src', 'modules', moduleName, filename);
  fs.writeFileSync(filepath, content, 'utf8');
}
console.log('Refactored all tools');
