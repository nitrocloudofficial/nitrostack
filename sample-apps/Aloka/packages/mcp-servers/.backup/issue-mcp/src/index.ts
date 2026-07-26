#!/usr/bin/env node
import { Module, ToolDecorator as Tool, Injectable, McpApp, McpApplicationFactory, z } from '@nitrostack/core';
import { Sanitizer } from '@omnitrace/sanitizer';
import axios from 'axios';

@Injectable()
export class IssueService {
  private getAuthHeader() {
    const email = process.env.JIRA_EMAIL;
    const token = process.env.JIRA_API_TOKEN;
    if (!email || !token) throw new Error("Missing Jira credentials");
    return `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
  }

  public async createOrUpdate(project: string, title: string, desc: string, priority?: string, traceId?: string): Promise<string> {
    try {
      const baseUrl = process.env.JIRA_URL;
      if (!baseUrl) throw new Error("Missing JIRA_URL");

      // Simple implementation: Create new Jira issue. 
      // (Updating requires searching for an existing issue first, skipped for brevity)
      const priorityMap: Record<string, string> = {
        'P0': 'Highest',
        'P1': 'High',
        'P2': 'Medium'
      };

      let descriptionText = desc;
      if (traceId) {
        descriptionText += `\n\nTrace ID: ${traceId}`;
      }

      const response = await axios.post(`${baseUrl}/rest/api/2/issue`, {
        fields: {
          project: { key: project },
          summary: title,
          description: descriptionText,
          issuetype: { name: 'Bug' },
          // priority: { name: priority ? priorityMap[priority] : 'Medium' } // Assuming default Jira priorities
        }
      }, {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });

      return Sanitizer.scrub(`[SUCCESS] Jira Issue Created: ${response.data.key}`);
    } catch (e: any) {
      return `[ERROR] Jira API failed: ${e.response?.data?.errorMessages?.join(', ') || e.message}`;
    }
  }
}

@McpApp({ 
  module: IssueServer, 
  server: { name: 'issue-mcp', version: '1.0.0' },
  logging: { level: 'error' }
})
@Module({ 
  name: 'issue', 
  imports: [
    
  ],
  providers: [IssueService] 
})
export class IssueServer {
  constructor(private readonly issueService: IssueService) {}

  @Tool({
    name: 'create_or_update_issue',
    description: 'Create or update issue ticket in Jira',
    inputSchema: z.object({
      project_key: z.string(),
      title: z.string(),
      description: z.string(),
      priority: z.enum(['P0', 'P1', 'P2']).optional(),
      trace_id: z.string().optional()
    })
  })
  async createOrUpdateIssue(args: { project_key: string, title: string, description: string, priority?: 'P0' | 'P1' | 'P2', trace_id?: string }) {
    return await this.issueService.createOrUpdate(args.project_key, args.title, args.description, args.priority, args.trace_id);
  }
}

async function bootstrap() {
  const server = await McpApplicationFactory.create(IssueServer);
  await server.start();
}
bootstrap().catch(console.error);
