import { Injectable } from '@nitrostack/core';
import { Sanitizer } from '@omnitrace/sanitizer';

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

      const response = await fetch(`${baseUrl}/rest/api/2/issue`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            project: { key: project },
            summary: title,
            description: descriptionText,
            issuetype: { name: 'Task' },
            // priority: { name: priority ? priorityMap[priority] : 'Medium' } // Assuming default Jira priorities
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      const data = await response.json();
      return Sanitizer.scrub(`[SUCCESS] Jira Issue Created: ${data.key}`);
    } catch (e: any) {
      return `[ERROR] Jira API failed: ${e.message}`;
    }
  }
}
