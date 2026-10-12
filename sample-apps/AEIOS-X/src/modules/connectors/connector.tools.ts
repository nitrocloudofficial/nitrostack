import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { ConnectorService } from './connector.service.js';

const connectorService = new ConnectorService();

export class ConnectorTools {
  @Tool({
    name: 'connector_list',
    description: 'List all enterprise connectors and their status (GitHub, Slack, Jira)',
    parameters: z.object({}),
  })
  async listConnectors(ctx: ExecutionContext) {
    const connectors = connectorService.listConnectors();
    return { content: [{ type: 'text' as const, text: JSON.stringify({ connectors }, null, 2) }] };
  }

  @Tool({
    name: 'connector_check',
    description: 'Check connectivity status of a specific enterprise connector',
    parameters: z.object({
      connector: z.enum(['github', 'slack', 'jira']).describe('Connector to check'),
    }),
  })
  async checkConnector(ctx: ExecutionContext) {
    const { connector } = ctx.params as { connector: string };
    const status = await connectorService.checkConnection(connector);
    return { content: [{ type: 'text' as const, text: JSON.stringify(status, null, 2) }] };
  }

  @Tool({
    name: 'github_repos',
    description: 'List GitHub repositories for the authenticated user',
    parameters: z.object({
      sort: z.enum(['updated', 'created', 'pushed', 'full_name']).optional().describe('Sort order'),
      limit: z.number().optional().describe('Max repos to return'),
    }),
  })
  async githubRepos(ctx: ExecutionContext) {
    const { sort, limit } = ctx.params as { sort?: string; limit?: number };
    try {
      const repos = await connectorService.githubRequest(`/user/repos?sort=${sort || 'updated'}&per_page=${limit || 10}`);
      return { content: [{ type: 'text' as const, text: JSON.stringify(repos, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ error: (err as Error).message }, null, 2) }] };
    }
  }

  @Tool({
    name: 'github_issues',
    description: 'List issues from a GitHub repository',
    parameters: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      state: z.enum(['open', 'closed', 'all']).optional().describe('Issue state filter'),
    }),
  })
  async githubIssues(ctx: ExecutionContext) {
    const { owner, repo, state } = ctx.params as { owner: string; repo: string; state?: string };
    try {
      const issues = await connectorService.githubRequest(`/repos/${owner}/${repo}/issues?state=${state || 'open'}&per_page=20`);
      return { content: [{ type: 'text' as const, text: JSON.stringify(issues, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ error: (err as Error).message }, null, 2) }] };
    }
  }

  @Tool({
    name: 'github_create_issue',
    description: 'Create a new issue in a GitHub repository',
    parameters: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      title: z.string().describe('Issue title'),
      body: z.string().optional().describe('Issue body/description'),
      labels: z.array(z.string()).optional().describe('Labels to apply'),
    }),
  })
  async githubCreateIssue(ctx: ExecutionContext) {
    const { owner, repo, title, body, labels } = ctx.params as { owner: string; repo: string; title: string; body?: string; labels?: string[] };
    try {
      const issue = await connectorService.githubRequest(`/repos/${owner}/${repo}/issues`, 'POST', { title, body, labels });
      return { content: [{ type: 'text' as const, text: JSON.stringify(issue, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ error: (err as Error).message }, null, 2) }] };
    }
  }

  @Tool({
    name: 'slack_send_message',
    description: 'Send a message to a Slack channel',
    parameters: z.object({
      channel: z.string().describe('Slack channel ID or name'),
      text: z.string().describe('Message text'),
    }),
  })
  async slackSendMessage(ctx: ExecutionContext) {
    const { channel, text } = ctx.params as { channel: string; text: string };
    try {
      const result = await connectorService.slackRequest('chat.postMessage', { channel, text });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ error: (err as Error).message }, null, 2) }] };
    }
  }

  @Tool({
    name: 'jira_search',
    description: 'Search Jira issues using JQL query',
    parameters: z.object({
      jql: z.string().describe('JQL search query'),
      maxResults: z.number().optional().describe('Max results to return'),
    }),
  })
  async jiraSearch(ctx: ExecutionContext) {
    const { jql, maxResults } = ctx.params as { jql: string; maxResults?: number };
    try {
      const result = await connectorService.jiraRequest(`/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults || 20}`);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ error: (err as Error).message }, null, 2) }] };
    }
  }
}
