import 'dotenv/config';
import { McpClientsService } from './src/services/mcp-clients.service.js';

async function testEmail() {
  console.log('Testing Gmail MCP...');
  const mcp = new McpClientsService();
  try {
    const to = process.env.SMTP_USER || 'returns@supplier.com';
    console.log(`Sending email to ${to}...`);
    await mcp.sendGmailEmail(
      to,
      'Test Email from FlowLogix',
      'This is a test email sent via Gmail MCP!'
    );
    console.log('Email sent successfully!');
  } catch (error) {
    console.error('Error sending email:', error);
  } finally {
    process.exit(0);
  }
}

testEmail();
