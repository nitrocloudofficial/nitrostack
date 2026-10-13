import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class McpBridge {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private connected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(private pythonModule: string) {
    this.client = new Client(
      { name: 'invenio-ts-bridge', version: '1.0.0' },
      { capabilities: {} }
    );
  }

  private async connect(): Promise<void> {
    if (this.connected) return;
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = (async () => {
      console.log(`[McpBridge] Starting Python backend: ${this.pythonModule}`);
      this.transport = new StdioClientTransport({
        command: 'python', // Standard python command
        args: ['-m', this.pythonModule]
      });

      await this.client.connect(this.transport);
      this.connected = true;
      console.log(`[McpBridge] Connected to ${this.pythonModule}`);
    })();

    return this.connectionPromise;
  }

  async callTool(name: string, args: Record<string, any> = {}): Promise<any> {
    await this.connect();
    
    try {
      const result = await this.client.callTool({
        name,
        arguments: args
      });
      
      const content = result.content as any[];
      // FastMCP Python tools usually return a single TextContent containing JSON string
      if (content && content.length > 0 && content[0].type === 'text') {
        const textValue = content[0].text;
        try {
          // Try to parse the returned text as JSON
          return JSON.parse(textValue);
        } catch (e) {
          // If it's not JSON, just return the string
          return textValue;
        }
      }
      return result;
    } catch (error) {
      console.error(`[McpBridge] Error calling tool ${name} on ${this.pythonModule}:`, error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.connected = false;
      this.connectionPromise = null;
    }
  }
}
