import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { verify_claim } from "./tools/verify_claim";
import { get_market_data } from "./tools/get_market_data";

// 1. Initialize Server
const server = new Server(
    { name: "nitrostack-financial-tools", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

// 2. Define Available Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "verify_claim",
                description: "Verify a financial claim against a mock GST database.",
                inputSchema: {
                    type: "object",
                    properties: {
                        claimType: { type: "string" },
                        claimedValue: { type: "number" },
                        contextId: { type: "string" }
                    },
                    required: ["claimType", "claimedValue", "contextId"]
                }
            },
            {
                name: "get_market_data",
                description: "Fetch live market growth data for a sector.",
                inputSchema: {
                    type: "object",
                    properties: { sector: { type: "string" } },
                    required: ["sector"]
                }
            }
        ]
    };
});

// 3. Handle Tool Execution by mapping to our existing tool logic
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "verify_claim") {
        const { claimType, claimedValue, contextId } = request.params.arguments as any;
        
        // Call the internal logic, but surface it over MCP
        const result = await verify_claim(claimType, claimedValue, contextId);
        
        return { toolResult: result };
    }

    if (request.params.name === "get_market_data") {
        const { sector } = request.params.arguments as any;
        
        // Call the internal logic, but surface it over MCP
        const result = await get_market_data(sector);
        
        return { toolResult: result };
    }

    throw new Error(`Tool not found: ${request.params.name}`);
});

// 4. Start Server
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[MCP Server] NitroStack Universal MCP Server running on stdio"); // stderr for logs
}
run().catch(console.error);
