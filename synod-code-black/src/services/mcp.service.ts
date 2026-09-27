import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from 'path';

export class McpService {
    private client: Client | null = null;
    private isConnected: boolean = false;

    public async connect() {
        if (this.isConnected) return;
        
        console.log(`\n🔌 [McpService] Spawning child MCP server process...`);
        
        // Path to the mcp-server we just created in the same project!
        const serverPath = path.join(__dirname, '../mcp-server.ts');
        
        // We use ts-node to execute the typescript file directly as a child process
        const transport = new StdioClientTransport({
            command: "npx",
            args: ["ts-node", serverPath]
        });
        
        this.client = new Client(
            { name: "creditcourt-web-client", version: "1.0.0" },
            { capabilities: { tools: {} } }
        );
        
        await this.client.connect(transport);
        this.isConnected = true;
        console.log(`🔌 [McpService] Successfully connected to Internal NitroStack MCP Server!`);
    }

    public async callTool(toolName: string, args: any): Promise<any> {
        if (!this.client || !this.isConnected) {
            throw new Error("MCP Client is not connected. Call connect() first.");
        }
        
        console.log(`[McpService] Requesting tool execution over MCP Bridge: ${toolName}`);
        
        const response = await this.client.callTool({
            name: toolName,
            arguments: args
        });
        
        // MCP usually returns { toolResult: ... } based on our custom server definition
        return (response as any).toolResult || response;
    }
}
