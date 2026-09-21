import { ToolDecorator as Tool, z, ExecutionContext } from '@nitrostack/core';
import { google } from 'googleapis';

function getGoogleAuth() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost'
  );
  oAuth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
  return oAuth2Client;
}

function getJiraAuthHeader() {
  const creds = process.env.JIRA_EMAIL + ':' + process.env.JIRA_API_TOKEN;
  const encoded = Buffer.from(creds).toString('base64');
  return 'Basic ' + encoded;
}

export class KnowledgeTools {
  @Tool({
    name: 'get_project_update',
    description: 'Get a combined update on a project by searching GitHub commits, Google Drive files, Gmail emails, Jira pending tasks, and upcoming Calendar events for a keyword. Use this for broad questions like "what happened with X" or "give me a full update on Y".',
    inputSchema: z.object({
      keyword: z.string().describe('Project name or keyword to search for across all sources'),
      githubOwner: z.string().optional().describe('GitHub repo owner, if a specific repo should be checked'),
      githubRepo: z.string().optional().describe('GitHub repo name, if a specific repo should be checked'),
      jiraProjectKey: z.string().optional().describe('Jira project key, if pending tasks should be checked')
    })
  })
  async getProjectUpdate(input: any, ctx: ExecutionContext) {
    const results: any = {
      keyword: input.keyword,
      github: null, githubError: null,
      drive: null, driveError: null,
      gmail: null, gmailError: null,
      jira: null, jiraError: null,
      calendar: null, calendarError: null
    };

    // GitHub commits
    if (input.githubOwner && input.githubRepo) {
      try {
        const url = 'https://api.github.com/repos/' + input.githubOwner + '/' + input.githubRepo + '/commits?per_page=5';
        const response = await fetch(url, {
          headers: {
            Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
            Accept: 'application/vnd.github+json'
          }
        });
        if (response.ok) {
          const commits = await response.json() as any[];
          results.github = commits.map((c: any) => ({
            message: c.commit.message,
            author: c.commit.author.name,
            date: c.commit.author.date
          }));
        } else {
          results.githubError = 'GitHub API error: ' + response.status;
        }
      } catch (err: any) {
        results.githubError = err.message;
      }
    }

    // Google Drive search
    try {
      const auth = getGoogleAuth();
      const drive = google.drive({ version: 'v3', auth });
      const res = await drive.files.list({
        q: "name contains '" + input.keyword + "'",
        pageSize: 5,
        fields: 'files(id, name, mimeType, modifiedTime, webViewLink)'
      });
      const files = res.data.files || [];
      results.drive = files.map((f: any) => ({
        name: f.name,
        modified: f.modifiedTime,
        link: f.webViewLink
      }));
    } catch (err: any) {
      results.driveError = err.message;
    }

    // Gmail search
    try {
      const auth = getGoogleAuth();
      const gmail = google.gmail({ version: 'v1', auth });
      const list = await gmail.users.messages.list({
        userId: 'me',
        q: input.keyword,
        maxResults: 5
      });
      const messages = list.data.messages || [];
      const details = await Promise.all(
        messages.map(async (m: any) => {
          const msg = await gmail.users.messages.get({
            userId: 'me',
            id: m.id,
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'Date']
          });
          const headers = msg.data.payload?.headers || [];
          const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || '';
          return {
            subject: getHeader('Subject'),
            from: getHeader('From'),
            date: getHeader('Date'),
            snippet: msg.data.snippet
          };
        })
      );
      results.gmail = details;
    } catch (err: any) {
      results.gmailError = err.message;
    }

    // Jira pending tasks matching keyword
    if (input.jiraProjectKey) {
      try {
        const jql = 'project = ' + input.jiraProjectKey + ' AND text ~ "' + input.keyword + '" AND statusCategory != Done';
        const url = process.env.JIRA_BASE_URL + '/rest/api/3/search/jql?jql=' + encodeURIComponent(jql) + '&maxResults=5&fields=summary,status,assignee';
        const response = await fetch(url, {
          headers: {
            Authorization: getJiraAuthHeader(),
            Accept: 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json() as any;
          results.jira = data.issues.map((i: any) => ({
            key: i.key,
            summary: i.fields.summary,
            status: i.fields.status.name,
            assignee: i.fields.assignee ? i.fields.assignee.displayName : 'Unassigned'
          }));
        } else {
          results.jiraError = 'Jira API error: ' + response.status;
        }
      } catch (err: any) {
        results.jiraError = err.message;
      }
    }

    // Upcoming Calendar events matching keyword
    try {
      const auth = getGoogleAuth();
      const calendar = google.calendar({ version: 'v3', auth });
      const now = new Date().toISOString();
      const future = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const res = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now,
        timeMax: future,
        q: input.keyword,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 5
      });
      const events = (res.data.items || []).map((e: any) => ({
        summary: e.summary,
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date
      }));
      results.calendar = events;
    } catch (err: any) {
      results.calendarError = err.message;
    }

    return results;
  }
}