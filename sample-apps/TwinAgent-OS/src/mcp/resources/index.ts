import { memoryService } from '../../core/memory/service.js';
import { graphService } from '../../core/graph/service.js';
import { analyticsService } from '../../core/analytics/service.js';

export interface MCPResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const mcpResourceDefinitions: MCPResourceDefinition[] = [
  {
    uri: 'twinagent://memory/timeline',
    name: 'Organizational Timeline Memory',
    description: 'Historical timeline of enterprise decisions, meetings, and project milestones',
    mimeType: 'application/json',
  },
  {
    uri: 'twinagent://graph/enterprise',
    name: 'Enterprise Knowledge Graph',
    description: 'Graph structure mapping employees, projects, dependencies, and ownerships',
    mimeType: 'application/json',
  },
  {
    uri: 'twinagent://analytics/dashboard',
    name: 'Organizational Telemetry Dashboard',
    description: 'Real-time telemetry indicators covering health, burnout index, and project risks',
    mimeType: 'application/json',
  },
  {
    uri: 'twinagent://system/health',
    name: 'TwinAgent Engine System Health',
    description: 'Runtime health metrics for REST, WebSocket, Redis, and Database services',
    mimeType: 'application/json',
  },
];

export class MCPResourceHandlers {
  async readResource(uri: string, organizationId: string) {
    let data: unknown;
    if (uri === 'twinagent://memory/timeline') {
      data = await memoryService.getTimeline(organizationId);
    } else if (uri === 'twinagent://graph/enterprise') {
      data = await graphService.getGraph(organizationId);
    } else if (uri === 'twinagent://analytics/dashboard') {
      data = await analyticsService.getDashboardAnalytics(organizationId);
    } else if (uri === 'twinagent://system/health') {
      data = {
        status: 'UP',
        timestamp: new Date().toISOString(),
        engine: 'TwinAgent OS Backend v1.0.0',
      };
    } else {
      throw new Error(`Resource URI not found: ${uri}`);
    }

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
}

export const mcpResourceHandlers = new MCPResourceHandlers();
