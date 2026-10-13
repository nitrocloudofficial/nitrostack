/**
 * NitroStack MCP TypeScript Server -- OT Security Responder
 * ==========================================================
 * Created for NitroStack integration at C:\Users\darsh\nitrostack_project
 * Using the official Model Context Protocol TypeScript SDK (@modelcontextprotocol/sdk).
 *
 * Each tool handler delegates DIRECTLY to the converted TypeScript logic in src/.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

// Import converted TypeScript logic directly
import { WustlClassifier } from "../detection/classifier.js";
import { getMitreMapping } from "../agent/mitre.js";
import { draftIncidentReport } from "../agent/report.js";
import {
  AssetInfoController,
  TicketingController,
  ContainmentController,
  NotificationController
} from "./mcp_servers.js";
import { OtSecurityOrchestrator } from "../agent/orchestrator.js";

// Path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const ASSETS_CSV = path.join(DATA_DIR, "assets.csv");
const MITRE_CSV = path.join(DATA_DIR, "mitre_map.csv");

// Instantiate underlying converted TypeScript modules
const classifier = new WustlClassifier();
const assetInfo = new AssetInfoController();
const ticketing = new TicketingController();
const containment = new ContainmentController();
const orchestrator = new OtSecurityOrchestrator();

// ─── Zod Schemas for Input Validation ──────────────────────────────────────
export const ClassifyFlowSchema = z.object({
  flow_features: z.record(z.any()).describe("Network flow feature vector (Mean, Dport, SrcPkts, DstPkts, TotPkts, etc.)")
});

export const AssetLookupSchema = z.object({
  ip_or_id: z.string().describe("Target IP address or asset_id")
});

export const IncidentListSchema = z.object({
  asset_id: z.string().describe("Target asset ID"),
  window_hours: z.number().optional().default(24).describe("Time window in hours")
});

export const CampaignSchema = z.object({
  zone: z.string().optional().describe("OT Zone (e.g. Zone 2)"),
  subnet: z.string().optional().describe("Subnet (e.g. 10.0.4.0/24)"),
  window_minutes: z.number().optional().default(15),
  src_ip: z.string().optional().describe("Attacker source IP")
});

export const MitreSchema = z.object({
  attack_type: z.string().describe("Attack type string (Reconn, DoS, CommInj, Backdoor)")
});

export const CreateTicketSchema = z.object({
  asset_id: z.string(),
  severity: z.string().describe("Severity rating: P1, P2, P3, P4"),
  mitre_id: z.string(),
  description: z.string(),
  action_field: z.string(),
  campaign_id: z.string().optional()
});

export const AutoRemediateSchema = z.object({
  asset_id: z.string(),
  attack_type: z.string(),
  mitre_id: z.string(),
  reason: z.string()
});

export const ProposeIsolationSchema = z.object({
  asset_id: z.string(),
  reason: z.string(),
  mitre_id: z.string()
});

export const ExecuteIsolationSchema = z.object({
  proposal_id: z.string(),
  approved_by: z.string().describe("Human operator ID/role giving sign-off")
});

export const IncidentResponseSchema = z.object({
  event_id: z.string(),
  src_ip: z.string(),
  dst_ip: z.string(),
  attack_type: z.string(),
  protocol: z.string().optional().default("Modbus/TCP"),
  total_packets: z.number().optional().default(1187)
});

// ─── Initialize MCP Server ─────────────────────────────────────────────────
export const server = new Server(
  {
    name: "nitrostack-ot-responder",
    version: "2.0.0"
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  }
);

// ─── Register Tool Definitions ──────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "classify_flow",
        description: "Run WUSTL-IIoT-2021 Random Forest ML classifier on a network flow feature dictionary.",
        inputSchema: {
          type: "object",
          properties: {
            flow_features: { type: "object", description: "Flow feature vector" }
          },
          required: ["flow_features"]
        }
      },
      {
        name: "get_asset",
        description: "Lookup asset metadata, zone, subnet, and criticality. Unknown assets default to fail-safe CRITICAL.",
        inputSchema: {
          type: "object",
          properties: {
            ip_or_id: { type: "string", description: "IP address or asset_id" }
          },
          required: ["ip_or_id"]
        }
      },
      {
        name: "list_recent_incidents",
        description: "Retrieve recent incident history for a specific asset.",
        inputSchema: {
          type: "object",
          properties: {
            asset_id: { type: "string" },
            window_hours: { type: "number", default: 24 }
          },
          required: ["asset_id"]
        }
      },
      {
        name: "correlate_campaign",
        description: "Correlate intrusion events across Zone, Subnet, or Source IP to detect multi-asset campaigns.",
        inputSchema: {
          type: "object",
          properties: {
            zone: { type: "string" },
            subnet: { type: "string" },
            window_minutes: { type: "number", default: 15 },
            src_ip: { type: "string" }
          }
        }
      },
      {
        name: "get_mitre_mapping",
        description: "Map an attack classification to MITRE ATT&CK for ICS matrix (Technique ID, Tactic, Technique Name).",
        inputSchema: {
          type: "object",
          properties: {
            attack_type: { type: "string" }
          },
          required: ["attack_type"]
        }
      },
      {
        name: "create_work_order",
        description: "Generate an auditable work order ticket in SQLite ticketing store.",
        inputSchema: {
          type: "object",
          properties: {
            asset_id: { type: "string" },
            severity: { type: "string" },
            mitre_id: { type: "string" },
            description: { type: "string" },
            action_field: { type: "string" },
            campaign_id: { type: "string" }
          },
          required: ["asset_id", "severity", "mitre_id", "description", "action_field"]
        }
      },
      {
        name: "auto_remediate",
        description: "Execute autonomous switch ACL containment on Low/Medium criticality assets ONLY. Server safety gate BLOCKS High/Critical.",
        inputSchema: {
          type: "object",
          properties: {
            asset_id: { type: "string" },
            attack_type: { type: "string" },
            mitre_id: { type: "string" },
            reason: { type: "string" }
          },
          required: ["asset_id", "attack_type", "mitre_id", "reason"]
        }
      },
      {
        name: "propose_isolation",
        description: "Draft network isolation proposal for High/Critical assets awaiting human operator sign-off.",
        inputSchema: {
          type: "object",
          properties: {
            asset_id: { type: "string" },
            reason: { type: "string" },
            mitre_id: { type: "string" }
          },
          required: ["asset_id", "reason", "mitre_id"]
        }
      },
      {
        name: "execute_isolation",
        description: "Execute network isolation for a proposal. REQUIRES mandatory approved_by operator sign-off.",
        inputSchema: {
          type: "object",
          properties: {
            proposal_id: { type: "string" },
            approved_by: { type: "string" }
          },
          required: ["proposal_id", "approved_by"]
        }
      },
      {
        name: "run_incident_response",
        description: "Execute full agentic incident response pipeline: Enrich -> Correlate -> Classify -> Decide (Ideas 1 & 2) -> Act -> Ticket -> Report.",
        inputSchema: {
          type: "object",
          properties: {
            event_id: { type: "string" },
            src_ip: { type: "string" },
            dst_ip: { type: "string" },
            attack_type: { type: "string" },
            protocol: { type: "string", default: "Modbus/TCP" },
            total_packets: { type: "number", default: 1187 }
          },
          required: ["event_id", "src_ip", "dst_ip", "attack_type"]
        }
      }
    ]
  };
});

// ─── Call Tool Handler (Delegates Directly to Converted Code) ───────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs = {} } = request.params;

  try {
    switch (name) {
      case "classify_flow": {
        const validated = ClassifyFlowSchema.parse(rawArgs);
        const result = classifier.predictFlow(validated.flow_features);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "get_asset": {
        const validated = AssetLookupSchema.parse(rawArgs);
        const result = assetInfo.getAsset(validated.ip_or_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "list_recent_incidents": {
        const validated = IncidentListSchema.parse(rawArgs);
        const result = assetInfo.listRecentIncidents(validated.asset_id, validated.window_hours);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "correlate_campaign": {
        const validated = CampaignSchema.parse(rawArgs);
        const result = assetInfo.correlateCampaign(validated.zone, validated.subnet, validated.window_minutes, validated.src_ip);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "get_mitre_mapping": {
        const validated = MitreSchema.parse(rawArgs);
        const result = getMitreMapping(validated.attack_type);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "create_work_order": {
        const validated = CreateTicketSchema.parse(rawArgs);
        const result = ticketing.createWorkOrder(
          validated.asset_id,
          validated.severity,
          validated.mitre_id,
          validated.description,
          validated.action_field,
          validated.campaign_id
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "auto_remediate": {
        const validated = AutoRemediateSchema.parse(rawArgs);
        try {
          const result = containment.autoRemediate(
            validated.asset_id,
            validated.attack_type,
            validated.mitre_id,
            validated.reason
          );
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (err: any) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ status: "BLOCKED", error: err.message }, null, 2)
            }]
          };
        }
      }

      case "propose_isolation": {
        const validated = ProposeIsolationSchema.parse(rawArgs);
        const result = containment.proposeIsolation(validated.asset_id, validated.reason, validated.mitre_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "execute_isolation": {
        const validated = ExecuteIsolationSchema.parse(rawArgs);
        try {
          const result = containment.executeIsolation(validated.proposal_id, validated.approved_by);
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (err: any) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ status: "BLOCKED", error: err.message }, null, 2)
            }]
          };
        }
      }

      case "run_incident_response": {
        const validated = IncidentResponseSchema.parse(rawArgs);
        const [res, report] = await orchestrator.processAnomalyEvent({
          event_id: validated.event_id,
          src_ip: validated.src_ip,
          dst_ip: validated.dst_ip,
          attack_type: validated.attack_type,
          protocol: validated.protocol,
          total_packets: validated.total_packets
        });
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ ...res, report }, null, 2)
          }]
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Tool '${name}' not found.`);
    }
  } catch (err: any) {
    if (err instanceof McpError) throw err;
    throw new McpError(ErrorCode.InvalidParams, `Validation or execution error in tool '${name}': ${err.message}`);
  }
});

// ─── Register Resources ─────────────────────────────────────────────────────
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      { uri: "ot://assets/inventory", name: "Asset Inventory", mimeType: "text/csv" },
      { uri: "ot://mitre/mapping", name: "MITRE ATT&CK Mapping", mimeType: "text/csv" }
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  if (uri === "ot://assets/inventory" && fs.existsSync(ASSETS_CSV)) {
    return { contents: [{ uri, mimeType: "text/csv", text: fs.readFileSync(ASSETS_CSV, "utf-8") }] };
  }
  if (uri === "ot://mitre/mapping" && fs.existsSync(MITRE_CSV)) {
    return { contents: [{ uri, mimeType: "text/csv", text: fs.readFileSync(MITRE_CSV, "utf-8") }] };
  }
  throw new McpError(ErrorCode.InvalidRequest, `Resource '${uri}' not found.`);
});

// ─── Server Entry Point ─────────────────────────────────────────────────────
export async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NitroStack OT Responder MCP Server listening over stdio transport...");
}

if (process.argv[1] && (process.argv[1].endsWith("server.ts") || process.argv[1].endsWith("server.js"))) {
  startServer().catch(err => {
    console.error("Server start error:", err);
    process.exit(1);
  });
}
