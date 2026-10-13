import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class McpClientsService {
  private slackClient: Client | null = null;
  private gmailClient: Client | null = null;
  private isConnectingSlack = false;
  private isConnectingGmail = false;

  /**
   * Lazy-loads the Slack MCP connection.
   */
  private async getSlackClient(): Promise<Client> {
    if (this.slackClient) return this.slackClient;
    if (this.isConnectingSlack) {
      // Wait if already connecting
      while (this.isConnectingSlack) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (this.slackClient) return this.slackClient;
    }

    this.isConnectingSlack = true;
    try {
      const transport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-slack'],
        env: process.env as Record<string, string>, // Pass current env (contains SLACK_BOT_TOKEN)
      });
      const client = new Client({ name: 'flowlogix-slack-client', version: '1.0.0' }, { capabilities: {} });
      await client.connect(transport);
      this.slackClient = client;
      console.log('✅ Slack MCP connected');
      return client;
    } finally {
      this.isConnectingSlack = false;
    }
  }

  /**
   * Lazy-loads the Gmail MCP connection.
   */
  private async getGmailClient(): Promise<Client> {
    if (this.gmailClient) return this.gmailClient;
    if (this.isConnectingGmail) {
      while (this.isConnectingGmail) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (this.gmailClient) return this.gmailClient;
    }

    this.isConnectingGmail = true;
    try {
      const transport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', '@martinzarfl/mail-mcp'],
        env: process.env as Record<string, string>, // Pass current env (contains SMTP_* vars)
      });
      const client = new Client({ name: 'flowlogix-gmail-client', version: '1.0.0' }, { capabilities: {} });
      await client.connect(transport);
      this.gmailClient = client;
      console.log('✅ Gmail MCP connected');
      return client;
    } finally {
      this.isConnectingGmail = false;
    }
  }

  /**
   * Dispatches a message to a Slack channel using the slack_post_message tool.
   */
  async sendSlackMessage(channel: string, text: string): Promise<void> {
    try {
      const client = await this.getSlackClient();
      await client.callTool({
        name: 'slack_post_message',
        arguments: {
          channel_id: 'D0BKWSRK4UC', // OVERRIDDEN FOR TESTING (was: channel.replace('#', ''))
          text,
        },
      });
    } catch (err) {
      console.error(`❌ Failed to send Slack message:`, err);
    }
  }

  /**
   * Dispatches an email using the gmail_send_email tool.
   */
  async sendGmailEmail(to: string, subject: string, body: string): Promise<void> {
    try {
      const client = await this.getGmailClient();
      await client.callTool({
        name: 'gmail_send_email',
        arguments: {
          to,
          subject,
          text: body,
        },
      });
    } catch (err) {
      console.error(`❌ Failed to send Gmail email:`, err);
    }
  }
}
