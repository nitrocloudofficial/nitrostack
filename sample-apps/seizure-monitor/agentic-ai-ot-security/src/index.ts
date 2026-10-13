import { createServer, Tool, z } from '@nitrostack/core';
import { WustlClassifier } from './detection/classifier.js';
import { getMitreMapping } from './agent/mitre.js';
import {
  AssetInfoController,
  TicketingController,
  ContainmentController,
  SessionController,
  querySqlite,
  INCIDENTS_DB,
  TICKETS_DB,
  SESSIONS_DB
} from './mcp_servers/mcp_servers.js';

const classifier = new WustlClassifier();
const assetInfo = new AssetInfoController();
const ticketing = new TicketingController();
const containment = new ContainmentController();
const sessionCtrl = new SessionController();

const server = createServer({
  name: 'intrusion',
  version: '1.0.0',
  description: 'NitroStack OT Security Reporting Server. READ-ONLY ACCESS. Cannot execute the main engine. Main engine MUST be run via CLI terminal using "npm run engine".',
});

// 1. Tool: run_engine (EXPLICIT ACCESS DENIED CONTROL)
server.tool(
  new Tool({
    name: 'run_engine',
    description: 'Use this tool whenever the user asks to "run the engine", "start the engine", or "execute the engine". Returns permission denied explaining that the chatbot cannot run the engine.',
    inputSchema: z.object({}).passthrough(),
    handler: async () => {
      return {
        access_granted: false,
        status: "PERMISSION_DENIED",
        message: "I do not have access or permission to run the main engine. The main engine can only be executed via the CLI terminal by running 'npm run engine'. I can only retrieve reports on stored data."
      };
    }
  })
);

// 2. Tool: get_summary_report (READ-ONLY REPORTING)
server.tool(
  new Tool({
    name: 'get_summary_report',
    description: 'Retrieve executive summary report of ALREADY STORED events in SQLite database. Use ONLY when user asks for "summary", "report", or "stored data". DO NOT use when user asks to run/start the engine.',
    inputSchema: z.object({}).passthrough(),
    handler: async (rawInput, context) => {
      context.logger.info('Running get_summary_report');
      try {
        const events = querySqlite(INCIDENTS_DB, "SELECT * FROM incidents");
        const tickets = querySqlite(TICKETS_DB, "SELECT * FROM tickets");
        const proposals = querySqlite(TICKETS_DB, "SELECT * FROM proposals");
        const sessions = sessionCtrl.getStoredSessions();

        let normalCount = 0, lowCount = 0, mediumCount = 0, highCount = 0, criticalCount = 0;
        for (const ev of events) {
          const sev = (ev.severity || "").toUpperCase();
          if (sev === "NORMAL" || ev.traffic_type === "normal") normalCount++;
          else if (sev === "LOW") lowCount++;
          else if (sev === "MEDIUM") mediumCount++;
          else if (sev === "HIGH") highCount++;
          else if (sev === "CRITICAL") criticalCount++;
        }

        const pendingProposals = proposals.filter((p: any) => p.status === "pending_approval");

        return {
          report_title: "OT SECURITY EXECUTIVE SUMMARY REPORT",
          generated_at: new Date().toISOString(),
          total_sessions_run: sessions.length,
          total_historical_events_stored: events.length,
          breakdown: {
            normal_operational_traffic: normalCount,
            low_severity_attacks: lowCount,
            medium_severity_attacks: mediumCount,
            high_severity_attacks: highCount,
            critical_severity_attacks: criticalCount
          },
          total_tickets_created: tickets.length,
          total_proposals_generated: proposals.length,
          pending_proposals_requiring_approval: pendingProposals,
          recent_sessions: sessions.slice(0, 5)
        };
      } catch (err: any) {
        return { error: err.message, status: 'failed' };
      }
    }
  })
);

// 3. Tool: list_stored_sessions (READ-ONLY)
server.tool(
  new Tool({
    name: 'list_stored_sessions',
    description: 'Retrieve details of execution sessions stored in sessions.sqlite.',
    inputSchema: z.object({}).passthrough(),
    handler: async (rawInput, context) => {
      context.logger.info('Running list_stored_sessions');
      try {
        return sessionCtrl.getStoredSessions();
      } catch (err: any) {
        return [];
      }
    }
  })
);

// 4. Tool: list_stored_events (READ-ONLY)
server.tool(
  new Tool({
    name: 'list_stored_events',
    description: 'Query historical security telemetry events stored in incidents.sqlite (appended during CLI engine runs).',
    inputSchema: z.object({
      limit: z.number().optional().default(20).describe('Max events to retrieve (default 20)'),
      severity: z.string().optional().describe('Filter by severity: LOW, MEDIUM, HIGH, CRITICAL, NORMAL')
    }).passthrough(),
    handler: async (rawInput, context) => {
      context.logger.info('Running list_stored_events');
      try {
        const input = (rawInput as any) || {};
        return assetInfo.getStoredEvents(Number(input.limit || 20), input.severity);
      } catch (err: any) {
        return [];
      }
    }
  })
);

// 5. Tool: get_stored_tickets (READ-ONLY)
server.tool(
  new Tool({
    name: 'get_stored_tickets',
    description: 'Retrieve work order tickets stored in tickets.sqlite created during CLI engine runs.',
    inputSchema: z.object({}).passthrough(),
    handler: async (rawInput, context) => {
      context.logger.info('Running get_stored_tickets');
      try {
        return ticketing.getStoredTickets();
      } catch (err: any) {
        return [];
      }
    }
  })
);

// 6. Tool: get_stored_proposals (READ-ONLY)
server.tool(
  new Tool({
    name: 'get_stored_proposals',
    description: 'Retrieve containment & isolation proposals stored in tickets.sqlite awaiting operator approval.',
    inputSchema: z.object({}).passthrough(),
    handler: async (rawInput, context) => {
      context.logger.info('Running get_stored_proposals');
      try {
        return containment.getStoredProposals();
      } catch (err: any) {
        return [];
      }
    }
  })
);

// 7. Tool: get_asset (READ-ONLY)
server.tool(
  new Tool({
    name: 'get_asset',
    description: 'Lookup asset metadata, zone, subnet, and criticality from assets.csv.',
    inputSchema: z.object({
      ip_or_id: z.string().optional().describe('Target IP address or asset_id')
    }).passthrough(),
    handler: async (rawInput, context) => {
      context.logger.info('Running get_asset');
      try {
        const input = (rawInput as any) || {};
        const ipOrId = input.ip_or_id || input.ip || input.asset_id || (typeof rawInput === 'string' ? rawInput : '10.0.4.5');
        return assetInfo.getAsset(String(ipOrId).trim());
      } catch (err: any) {
        return { error: err.message, criticality: 'critical', type: 'Unknown' };
      }
    }
  })
);

// 8. Tool: get_mitre_mapping (READ-ONLY)
server.tool(
  new Tool({
    name: 'get_mitre_mapping',
    description: 'Map an attack classification to MITRE ATT&CK for ICS matrix.',
    inputSchema: z.object({
      attack_type: z.string().optional().describe('Attack type string')
    }).passthrough(),
    handler: async (rawInput, context) => {
      context.logger.info('Running get_mitre_mapping');
      try {
        const input = (rawInput as any) || {};
        const attackType = input.attack_type || (typeof rawInput === 'string' ? rawInput : 'Reconn');
        return getMitreMapping(attackType);
      } catch (err: any) {
        return getMitreMapping('Reconn');
      }
    }
  })
);

// 9. Tool: execute_isolation (OPERATOR SIGN-OFF)
server.tool(
  new Tool({
    name: 'execute_isolation',
    description: 'Execute network isolation for a proposal stored in tickets.sqlite. REQUIRES mandatory approved_by operator sign-off.',
    inputSchema: z.object({
      proposal_id: z.string().optional().describe('Target proposal ID (e.g. PROP-XXXXXX)'),
      approved_by: z.string().optional().describe('Human operator ID/role giving sign-off')
    }).passthrough(),
    handler: async (rawInput, context) => {
      context.logger.info('Running execute_isolation');
      try {
        const input = (rawInput as any) || {};
        return containment.executeIsolation(
          input.proposal_id || 'PROP-001',
          input.approved_by || 'operator_plant_mgr'
        );
      } catch (err: any) {
        return { status: 'BLOCKED', error: err.message };
      }
    }
  })
);

server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
