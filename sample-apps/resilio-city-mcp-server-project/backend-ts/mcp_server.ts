// backend-ts/mcp_server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { loadOsmCity } from "./engine/osm_loader";

const server = new Server({
  name: "CityResilienceTSBridge",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
  }
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "load_city_summary",
        description: "Loads a city in the simulation engine and returns a lightweight summary",
        inputSchema: {
          type: "object",
          properties: {
            city_id: { type: "string" }
          },
          required: ["city_id"]
        }
      },
      // ... Add run_disaster_simulation and get_emergency_etas here
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "load_city_summary") {
    try {
      const cityId = request.params.arguments?.city_id as string;
      const cityData = await loadOsmCity(cityId);
      
      const numNodes = Object.keys(cityData.nodes).length;
      const numEdges = cityData.edges.length;
      
      return {
        content: [{
          type: "text",
          text: `Successfully loaded ${cityData.city_name} (${cityId}).\nNetwork Size: ${numNodes} intersections, ${numEdges} road segments.`
        }]
      };
    } catch (e: any) {
      return {
        content: [{ type: "text", text: `Error: ${e.message}` }],
        isError: true
      };
    }
  }

  throw new Error(`Tool not found: ${request.params.name}`);
});

// Run server using stdio transport
const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
