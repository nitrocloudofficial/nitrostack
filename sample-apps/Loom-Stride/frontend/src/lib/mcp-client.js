import { logProgress } from '../components/loader.js';

export class McpClient {
  constructor(endpoint = '/mcp-api') {
    this.endpoint = endpoint;
    this.sessionId = null;
    this.msgId = 1;
  }

  async ensureSession() {
    if (this.sessionId) {
      logProgress('Using active MCP session: ' + this.sessionId.slice(0, 8) + '...', 'muted');
      return this.sessionId;
    }

    try {
      logProgress('Initializing connection to ShoeFit MCP server...', 'info');
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      };

      const initBody = {
        jsonrpc: '2.0',
        id: this.msgId++,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: {
            name: 'shoefit-web-frontend',
            version: '1.0.0'
          }
        }
      };

      logProgress('Sending protocol handshake: initialize...', 'info');
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(initBody)
      });

      if (!response.ok) {
        throw new Error(`Init failed: HTTP ${response.status}`);
      }

      // Extract session ID
      const sid = response.headers.get('mcp-session-id');
      if (!sid) {
        throw new Error('No mcp-session-id returned from server');
      }

      this.sessionId = sid;
      logProgress(`Handshake accepted. Session ID: ${this.sessionId.slice(0, 8)}...`, 'success');

      // Send initialized notification
      const notifBody = {
        jsonrpc: '2.0',
        method: 'notifications/initialized'
      };

      logProgress('Sending confirmation: notifications/initialized...', 'info');
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          ...headers,
          'mcp-session-id': this.sessionId
        },
        body: JSON.stringify(notifBody)
      });

      logProgress('MCP Connection established successfully!', 'success');
      return this.sessionId;
    } catch (error) {
      logProgress('Failed to establish MCP connection: ' + error.message, 'error');
      console.error('Failed to initialize MCP Session:', error);
      throw error;
    }
  }

  async callTool(toolName, args = {}) {
    await this.ensureSession();

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'mcp-session-id': this.sessionId
    };

    const callBody = {
      jsonrpc: '2.0',
      id: this.msgId++,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    try {
      logProgress(`Executing tool: ${toolName}...`, 'info');
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(callBody)
      });

      if (!response.ok) {
        throw new Error(`Tool call failed: HTTP ${response.status}`);
      }

      logProgress(`Reading response stream from server...`, 'info');
      const rawText = await response.text();
      logProgress(`Parsing server-sent message blocks...`, 'info');
      const parsedData = this.parseSseContent(rawText);

      if (parsedData.error) {
        throw new Error(parsedData.error.message || 'JSON-RPC Error');
      }

      // Extract the content from JSON-RPC result
      const contentList = parsedData.result?.content || [];
      const textContent = contentList.find(c => c.type === 'text')?.text;
      
      if (!textContent) {
        throw new Error('No text content returned from tool execution');
      }

      logProgress(`Tool execution returned successfully.`, 'success');
      return JSON.parse(textContent);
    } catch (error) {
      logProgress(`Tool execution error: ${error.message}`, 'error');
      console.error(`Error invoking tool ${toolName}:`, error);
      throw error;
    }
  }

  parseSseContent(sseText) {
    const lines = sseText.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6).trim();
        try {
          return JSON.parse(jsonStr);
        } catch (e) {
          console.error('Failed to parse SSE data block:', e);
        }
      }
    }
    throw new Error('Invalid or empty SSE message block from MCP server');
  }
}

export const mcp = new McpClient();
