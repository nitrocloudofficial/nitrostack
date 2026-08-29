import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { queryLLM } from './llm.helper.js';

// Lazy imports to prevent circular dependencies at module load time
let GmailTools: any;
let CalendarTools: any;
let SlackTools: any;
let JiraTools: any;
let GithubTools: any;
let PrioritizerTools: any;
let ContextTools: any;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKENS_PATH = path.join(process.cwd(), 'google_tokens.json');

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export class GoogleAuthHelper {
  private static server: http.Server | null = null;

  /**
   * Generates Google OAuth authorization URL
   */
  static getAuthUrl(): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = 'http://localhost:3000/oauth/google/callback';
    const scopes = encodeURIComponent(
      'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly'
    );

    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent`;
  }

  /**
   * Starts a background HTTP callback listener on port 3000
   */
  static startCallbackServer() {
    if (this.server) return;

    this.server = http.createServer(async (req, res) => {
      const url = new URL(req.url || '', 'http://localhost:3000');

      // Enable CORS for frontend requests
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Health check endpoint
      if (url.pathname === '/api/health') {
        const slackConnected = !!process.env.SLACK_USER_TOKEN;
        const jiraConnected = !!(process.env.JIRA_DOMAIN && process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN);
        const githubConnected = !!process.env.GITHUB_TOKEN;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'ok', 
          googleConnected: fs.existsSync(TOKENS_PATH),
          slackConnected,
          jiraConnected,
          githubConnected
        }));
        return;
      }

      // Live notifications prioritization endpoint
      if (url.pathname === '/api/notifications') {
        try {
          // Dynamic import of modules to resolve runtime paths
          if (!GmailTools) {
            const gmailMod = await import('../gmail/gmail.tools.js');
            const calMod = await import('../calendar/calendar.tools.js');
            const slackMod = await import('../slack/slack.tools.js');
            const jiraMod = await import('../jira/jira.tools.js');
            const ghMod = await import('../github/github.tools.js');
            const ctxMod = await import('../context/context.tools.js');
            const prioMod = await import('../prioritizer/prioritizer.tools.js');

            GmailTools = gmailMod.GmailTools;
            CalendarTools = calMod.CalendarTools;
            SlackTools = slackMod.SlackTools;
            JiraTools = jiraMod.JiraTools;
            GithubTools = ghMod.GithubTools;
            ContextTools = ctxMod.ContextTools;
            PrioritizerTools = prioMod.PrioritizerTools;
          }

          const gmail = new GmailTools();
          const calendar = new CalendarTools();
          const slack = new SlackTools();
          const jira = new JiraTools();
          const github = new GithubTools();
          const context = new ContextTools();
          const prioritizer = new PrioritizerTools();

          const loggerMock = { info: console.log, error: console.error, warn: console.warn };
          const execCtx = { logger: loggerMock } as any;

          // 1. Compile Context
          const t0 = Date.now();
          const contextOutput = await context.buildUserContext({}, execCtx);
          const t1 = Date.now();
          const traces = [];
          traces.push({ timestamp: new Date(t1).toLocaleTimeString(), tool: 'buildUserContext', summary: 'Active projects & schedule extracted', duration: t1 - t0 });

          // 2. Fetch notifications in parallel
          const [gmailRes, calRes, slackRes, jiraRes, ghRes] = await Promise.all([
            gmail.fetchGmailNotifications({}, execCtx),
            calendar.fetchCalendarEvents({}, execCtx),
            slack.fetchSlackNotifications({}, execCtx),
            jira.fetchJiraNotifications({}, execCtx),
            github.fetchGithubNotifications({}, execCtx)
          ]);
          const t2 = Date.now();
          
          traces.push({ timestamp: new Date(t2).toLocaleTimeString(), tool: 'fetchGmailNotifications', summary: `${gmailRes.notifications?.length || 0} emails fetched`, duration: t2 - t1 });
          traces.push({ timestamp: new Date(t2).toLocaleTimeString(), tool: 'fetchCalendarEvents', summary: `${calRes.notifications?.length || 0} events fetched`, duration: t2 - t1 });
          traces.push({ timestamp: new Date(t2).toLocaleTimeString(), tool: 'fetchSlackNotifications', summary: `${slackRes.notifications?.length || 0} messages fetched`, duration: t2 - t1 });
          traces.push({ timestamp: new Date(t2).toLocaleTimeString(), tool: 'fetchJiraNotifications', summary: `${jiraRes.notifications?.length || 0} tickets fetched`, duration: t2 - t1 });
          traces.push({ timestamp: new Date(t2).toLocaleTimeString(), tool: 'fetchGithubNotifications', summary: `${ghRes.notifications?.length || 0} updates fetched`, duration: t2 - t1 });

          const allNotifications = [
            ...(gmailRes.notifications || []),
            ...(calRes.notifications || []),
            ...(slackRes.notifications || []),
            ...(jiraRes.notifications || []),
            ...(ghRes.notifications || [])
          ];

          // 3. Triage / Prioritize via Gemini LLM
          const t3 = Date.now();
          const triageResult = await prioritizer.prioritizeNotifications(
            { notifications: allNotifications, context: contextOutput },
            execCtx
          );
          const t4 = Date.now();
          traces.push({ timestamp: new Date(t4).toLocaleTimeString(), tool: 'prioritizeNotifications', summary: `${triageResult.prioritized?.length || 0} items triaged & tiered`, duration: t4 - t3 });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ...triageResult, traces }));
        } catch (error: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // Chat agent response completion endpoint
      if (url.pathname === '/api/chat' && req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk; });
        req.on('end', async () => {
          try {
            const payload = JSON.parse(bodyStr);
            const userQuestion = payload.message || '';
            const currentNotifications = payload.notifications || [];
            const chatHistory = payload.history || [];

            // Try using the configured LLM API if credentials are present, else fallback
            let replyText = '';
            const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
            let hasKey = false;
            if (provider === 'gemini') {
              hasKey = !!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('AQ.your-');
            } else {
              hasKey = !!(process.env.LLM_API_KEY || process.env.XAI_API_KEY || process.env.OPENAI_API_KEY);
            }

            if (hasKey) {
              try {
                // Construct a dense summarization prompt with history and list of alerts
                const prompt = `
You are FocusOps' Workspace Prioritizer AI Assistant.
The user is asking a question about their notifications. Answer clearly, directly, and concisely using the notifications provided below.

CRITICAL INSTRUCTION: If the user asks an irrelevant question that is not about their notifications, workspace tasks, or FocusOps logic (for example, asking general knowledge questions like 'what is the capital of france' or other off-topic prompts), you MUST reply exactly: 'im your focus agent i can only help with your notifications and worksapce tasks.'

FocusOps Triage & Prioritization Rules:
- Tier 1: "urgent_now" (🔴) - Immediate attention required:
  * Google Calendar meetings starting within 60 minutes.
  * Jira tasks assigned to you that are due today.
  * GitHub Action build/CI failures on the main branch.
  * Direct messages/mentions matching active project ("FocusOps") with key collaborators.
  * Critical PagerDuty alerts.
- Tier 2: "normal" (🟡) - Important updates but not blockers:
  * Slack DMs or direct @mentions.
  * Active Jira tasks assigned to you or watched by you.
  * GitHub PR review requests.
- Tier 3: "fyi_only" (🔵) - Low-priority updates:
  * Personal/promotional emails.
  * General public Slack channel updates (no direct mentions).
  * Standard GitHub repository pushes/commits.
  * Completed or past calendar events.

Chat History:
${chatHistory.map((h: any) => `${h.sender.toUpperCase()}: ${h.text}`).join('\n')}

Active Notifications:
${JSON.stringify(currentNotifications.map((n: any) => ({
                  id: n.id,
                  source: n.source,
                  sender: n.sender,
                  title: n.title,
                  snippet: n.snippet,
                  tier: n.tier,
                  reason: n.reason,
                  timestamp: n.timestamp
                })), null, 2)}

User Question: ${userQuestion}

Helpful Assistant Answer (Use markdown formatting, highlight keys, list matches/explanations clearly):
`;
                replyText = await queryLLM(
                  "You are a helpful notifications prioritized AI Assistant. Keep answers concise. If off-topic, reply exactly: 'im your focus agent i can only help with your notifications and worksapce tasks.'",
                  prompt
                );
              } catch (e) {
                // Fallback to rules on error
              }
            }

            // Standard fallback response rules if API is rate-limited or fails
            if (!replyText) {
              const cleaned = userQuestion.toLowerCase().trim();

              // Check for logic explanation queries
              if (cleaned.includes('how') && (cleaned.includes('prioritize') || cleaned.includes('logic') || cleaned.includes('work') || cleaned.includes('done') || cleaned.includes('triage'))) {
                replyText = `### 🧠 FocusOps Prioritization Logic\n\n` +
                  `I classify your notifications into three priority tiers based on context:\n\n` +
                  `1. 🔴 **Urgent Now**: Items requiring immediate attention:\n` +
                  `   * Google Calendar meetings starting within **60 minutes**.\n` +
                  `   * Jira tasks assigned to you that are **due today**.\n` +
                  `   * GitHub build/CI failures on the **main** branch.\n` +
                  `   * Mentions/channels matching active project & key collaborators.\n` +
                  `   * Critical PagerDuty alerts.\n\n` +
                  `2. 🟡 **Normal**: Important updates but not immediate blockers:\n` +
                  `   * Slack Direct Messages (DMs) or direct @mentions.\n` +
                  `   * Active Jira tasks assigned to you or watched by you.\n` +
                  `   * GitHub PR review requests.\n\n` +
                  `3. 🔵 **FYI Only**: Low-priority updates that can wait:\n` +
                  `   * Personal/promotional emails.\n` +
                  `   * General public Slack channel updates (no direct mention).\n` +
                  `   * Standard GitHub commits or push activities.\n` +
                  `   * Completed or past calendar events.`;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ text: replyText }));
                return;
              }
              
              // 1. Check for specific ticket matches (like FOC-1, FOC-2)
              const ticketMatch = cleaned.match(/[a-zA-Z]+-\d+/);
              let foundTicket = false;
              if (ticketMatch) {
                const ticketKey = ticketMatch[0].toUpperCase();
                const matched = currentNotifications.find((n: any) => 
                  n.title.toUpperCase().includes(ticketKey) || 
                  n.snippet.toUpperCase().includes(ticketKey)
                );
                if (matched) {
                  replyText = `Found Jira ticket **${ticketKey}**:\n` +
                              `* **Title**: ${matched.title.replace('[Jira] ', '')}\n` +
                              `* **Status**: ${matched.rawMetadata?.status || 'Open'}\n` +
                              `* **Priority**: ${matched.rawMetadata?.priority || 'Normal'}\n` +
                              `* **Triage**: prioritized as **${matched.tier.replace('_', ' ').toUpperCase()}** because: _${matched.reason}_\n` +
                              `* **Link**: [View in Jira](${matched.link})`;
                  foundTicket = true;
                }
              }

              if (!foundTicket) {
                // 2. Extract keywords from user question (filtering out common stop words and prepositions)
                const stopWords = new Set(['what', 'is', 'are', 'the', 'a', 'an', 'show', 'check', 'get', 'list', 'my', 'me', 'about', 'find', 'search', 'for', 'any', 'in', 'on', 'at', 'with', 'from', 'to', 'how']);
                const words = cleaned.split(/\s+/).filter((w: string) => w.length > 2 && !stopWords.has(w));
                
                // Find notifications containing the keywords
                const matches: any[] = [];
                if (words.length > 0) {
                  for (const n of currentNotifications) {
                    // Build search tags for this notification
                    const tags = new Set<string>();
                    tags.add(n.source.toLowerCase());
                    tags.add(n.sender.toLowerCase());
                    tags.add(n.title.toLowerCase());
                    tags.add(n.snippet.toLowerCase());
                    tags.add(n.reason.toLowerCase());

                    // Map synonym categories to sources
                    if (n.source === 'gmail') {
                      tags.add('mail');
                      tags.add('email');
                      tags.add('emails');
                      tags.add('gmail');
                    } else if (n.source === 'jira') {
                      tags.add('jira');
                      tags.add('ticket');
                      tags.add('tickets');
                      tags.add('task');
                      tags.add('tasks');
                      tags.add('issue');
                      tags.add('issues');
                    } else if (n.source === 'slack') {
                      tags.add('slack');
                      tags.add('chat');
                      tags.add('message');
                      tags.add('messages');
                      tags.add('dm');
                      tags.add('dms');
                    } else if (n.source === 'github') {
                      tags.add('github');
                      tags.add('pr');
                      tags.add('prs');
                      tags.add('pull');
                      tags.add('build');
                      tags.add('workflow');
                    } else if (n.source === 'calendar') {
                      tags.add('calendar');
                      tags.add('meeting');
                      tags.add('meetings');
                      tags.add('event');
                      tags.add('events');
                    }

                    // Check if EVERY search keyword matches at least one of the tags
                    const isMatch = words.every((word: string) => {
                      for (const tag of tags) {
                        if (tag.includes(word)) return true;
                      }
                      return false;
                    });

                    if (isMatch) {
                      matches.push(n);
                    }
                  }
                }

                if (matches.length > 0) {
                  replyText = `Found **${matches.length}** matching notifications for your query:\n\n` +
                    matches.map((n: any) => {
                      const sourceIcon = n.source === 'gmail' ? '✉️' : n.source === 'calendar' ? '📅' : n.source === 'jira' ? '🎫' : n.source === 'slack' ? '💬' : '🐙';
                      return `* ${sourceIcon} **[${n.source.toUpperCase()}]** ${n.sender}: _${n.title}_\n  > Triaged: **${n.tier.replace('_', ' ').toUpperCase()}**\n  > Reason: _${n.reason}_\n  > Summary: _${n.snippet.slice(0, 150)}_`;
                    }).join('\n\n');
                } else if (cleaned.includes('urgent') || cleaned.includes('important') || cleaned.includes('critical')) {
                  const urgentList = currentNotifications.filter((n: any) => n.tier === 'urgent_now');
                  replyText = urgentList.length > 0
                    ? `You have **${urgentList.length}** urgent tasks requiring action:\n` + 
                      urgentList.map((n: any) => `* **[${n.source.toUpperCase()}]** ${n.sender} - ${n.title} _(Reason: ${n.reason})_`).join('\n')
                    : "Good news! There are no urgent items right now.";
                } else if (cleaned.includes('slack') || cleaned.includes('chat')) {
                  const slackList = currentNotifications.filter((n: any) => n.source === 'slack');
                  replyText = slackList.length > 0
                    ? `Slack summary: You have **${slackList.length}** updates:\n` + 
                      slackList.map((n: any) => `* **${n.sender}**: "${n.snippet}"`).join('\n')
                    : "No Slack messages found.";
                } else if (cleaned.includes('github') || cleaned.includes('pr') || cleaned.includes('build')) {
                  const ghList = currentNotifications.filter((n: any) => n.source === 'github');
                  replyText = ghList.length > 0
                    ? `GitHub status: You have **${ghList.length}** items:\n` + 
                      ghList.map((n: any) => `* **${n.sender}** - ${n.title} _(${n.reason})_`).join('\n')
                    : "No GitHub activity found.";
                } else if (cleaned.includes('jira') || cleaned.includes('ticket') || cleaned.includes('task')) {
                  const jiraList = currentNotifications.filter((n: any) => n.source === 'jira');
                  replyText = jiraList.length > 0
                    ? `Jira status: You have **${jiraList.length}** tickets:\n` + 
                      jiraList.map((n: any) => `* **${n.title}** (Status: ${n.rawMetadata?.status || 'Open'})`).join('\n')
                    : "No Jira tickets found.";
                } else {
                  replyText = "im your focus agent i can only help with your notifications and worksapce tasks.";
                }
              }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ text: replyText }));
          } catch (err: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to process request: ' + err.message }));
          }
        });
        return;
      }

      // Login redirect route
      if (url.pathname === '/oauth/google/login') {
        res.writeHead(302, { Location: this.getAuthUrl() });
        res.end();
        return;
      }

      // Callback route
      if (url.pathname === '/oauth/google/callback') {
        const code = url.searchParams.get('code');
        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h3>Authentication Error: No code provided.</h3>');
          return;
        }

        try {
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              client_id: process.env.GOOGLE_CLIENT_ID || '',
              client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
              redirect_uri: 'http://localhost:3000/oauth/google/callback',
              grant_type: 'authorization_code',
            }),
          });

          if (!tokenResponse.ok) {
            const errBody = await tokenResponse.text();
            throw new Error(`Token exchange failed: ${errBody}`);
          }

          const tokens = (await tokenResponse.json()) as any;
          
          // Structure and save tokens
          const savedTokens: GoogleTokens = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || (this.getSavedTokens()?.refresh_token || ''),
            expiry_date: Date.now() + (tokens.expires_in * 1000),
          };

          fs.writeFileSync(TOKENS_PATH, JSON.stringify(savedTokens, null, 2));

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
              <h2 style="color: #10b981;">Authentication Successful!</h2>
              <p>Google Account successfully connected to FocusOps. You can close this tab now.</p>
            </div>
          `);
        } catch (error: any) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`<h3>Authentication Failed</h3><p>${error.message}</p>`);
        }
        return;
      }

      res.writeHead(404);
      res.end();
    });

    this.server.listen(3000, () => {
      console.log('⚡ Google OAuth Callback listener running on http://localhost:3000');
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn('⚠️ Port 3000 is already in use, skipping OAuth server startup.');
      } else {
        console.error('OAuth Server Error:', err);
      }
    });
  }

  /**
   * Reads saved tokens from disk
   */
  static getSavedTokens(): GoogleTokens | null {
    if (!fs.existsSync(TOKENS_PATH)) return null;
    try {
      return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
    } catch {
      return null;
    }
  }

  /**
   * Refreshes access token if expired, returns valid access token or null
   */
  static async getValidAccessToken(): Promise<string | null> {
    const tokens = this.getSavedTokens();
    if (!tokens) return null;

    const isExpired = Date.now() + (5 * 60 * 1000) >= tokens.expiry_date;
    if (!isExpired) {
      return tokens.access_token;
    }

    if (!tokens.refresh_token) {
      console.error('No refresh token available to renew Google access token.');
      return null;
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          refresh_token: tokens.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh request failed: ${await response.text()}`);
      }

      const refreshed = (await response.json()) as any;
      const updatedTokens: GoogleTokens = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || tokens.refresh_token,
        expiry_date: Date.now() + (refreshed.expires_in * 1000),
      };

      fs.writeFileSync(TOKENS_PATH, JSON.stringify(updatedTokens, null, 2));
      return updatedTokens.access_token;
    } catch (err) {
      console.error('Failed to refresh Google Access Token:', err);
      return null;
    }
  }
}
