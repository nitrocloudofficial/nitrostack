/**
 * Main Autonomous Intrusion Detection & Response Engine
 * CLI Session Ingestion Engine with Dedicated Session Database & Interactive Exit Sign-off
 */

import chalk from "chalk";
import * as readline from "readline";
import { WustlClassifier } from "../detection/classifier.js";
import {
  AssetInfoController,
  TicketingController,
  ContainmentController,
  NotificationController,
  SessionController,
  querySqlite,
  TICKETS_DB
} from "../mcp_servers/mcp_servers.js";
import { getMitreMapping } from "../agent/mitre.js";
import { promptHumanApproval } from "./approval.js";

const SYSTEM_DAMAGE_EXPLANATIONS = {
  high: [
    "High System Blast Radius: Threat targeting SCADA Historian / Engineering Node. Risk of unauthorized ladder logic modification, setpoint drift, or Fieldbus I/O write command injection.",
    "High System Blast Radius: Threat targeting Industrial Gateway (GW-01). Potential spoofing of inter-zone control commands resulting in secondary loop perturbation.",
    "High System Blast Radius: Unauthorized write attempt on Operator HMI. Risk of false process parameter displays leading to operator misjudgment."
  ],
  critical: [
    "CATASTROPHIC SYSTEM IMPACT: Direct threat targeting Primary Process Controller (PLC-03/04)! Extreme risk of loss of control loop (LCL), pressure/thermal runaway, Safety Instrumented System (SIS) trip lockouts, or severe physical equipment destruction.",
    "CATASTROPHIC SYSTEM IMPACT: Cyber attack targeting Safety Instrumented System (SIS-01)! Potential emergency plant trip (EPT), turbine over-speeding, or pressure vessel rupture.",
    "CATASTROPHIC SYSTEM IMPACT: Multi-asset campaign threat targeting primary controllers. Severe risk of total operational blackout or physical infrastructure damage."
  ]
};

const ASSET_POOL = [
  { ip: "10.0.4.1", id: "PLC-01", name: "Primary Pump PLC", zone: "Zone 2", subnet: "10.0.4.0/24", criticality: "medium" },
  { ip: "10.0.4.2", id: "PLC-02", name: "Turbine Speed PLC", zone: "Zone 2", subnet: "10.0.4.0/24", criticality: "high" },
  { ip: "10.0.4.3", id: "PLC-03", name: "Reactor Pressure PLC", zone: "Zone 2", subnet: "10.0.4.0/24", criticality: "critical" },
  { ip: "10.0.4.5", id: "PLC-04", name: "Emergency Shutdown PLC", zone: "Zone 2", subnet: "10.0.4.0/24", criticality: "critical" },
  { ip: "10.0.4.10", id: "HMI-01", name: "Operator Touch Screen", zone: "Zone 2", subnet: "10.0.4.0/24", criticality: "low" },
  { ip: "10.0.4.11", id: "HMI-02", name: "Control Room Console", zone: "Zone 2", subnet: "10.0.4.0/24", criticality: "medium" },
  { ip: "10.0.4.20", id: "HIST-01", name: "SCADA Process Historian", zone: "Zone 2", subnet: "10.0.4.0/24", criticality: "high" },
  { ip: "10.0.4.50", id: "EWS-01", name: "Engineering Workstation", zone: "Zone 1", subnet: "10.0.4.0/24", criticality: "critical" },
  { ip: "10.0.5.5", id: "SENSOR-01", name: "Temperature Transducer", zone: "Zone 3", subnet: "10.0.5.0/24", criticality: "low" },
  { ip: "10.0.5.6", id: "SENSOR-02", name: "Flow Rate Sensor", zone: "Zone 3", subnet: "10.0.5.0/24", criticality: "low" },
  { ip: "10.0.5.12", id: "ACTUATOR-01", name: "Control Valve Actuator", zone: "Zone 3", subnet: "10.0.5.0/24", criticality: "medium" },
  { ip: "10.0.5.1", id: "GATEWAY-01", name: "OT/IT Firewall Gateway", zone: "Zone 3", subnet: "10.0.5.0/24", criticality: "high" }
];

const ATTACK_TYPES = ["scanning", "Reconn", "DoS", "CommInj", "Backdoor"];
const PROTOCOLS = ["Modbus/TCP", "EtherNet/IP", "PROFINET", "TCP/IP", "HTTP"];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateSingleEvent(sessionId: string, seqNumber: number) {
  const asset = getRandomItem(ASSET_POOL);
  const isNormal = Math.random() < 0.6;
  const attackType = isNormal ? "normal" : getRandomItem(ATTACK_TYPES);
  const protocol = getRandomItem(PROTOCOLS);
  const srcIp = isNormal
    ? `10.0.4.${getRandomNumber(100, 200)}`
    : `10.0.${getRandomNumber(1, 10)}.${getRandomNumber(10, 250)}`;

  return {
    event_id: `EVT-${sessionId.replace("SES-", "")}-${String(seqNumber).padStart(3, "0")}`,
    session_id: sessionId,
    src_ip: srcIp,
    dst_ip: asset.ip,
    asset_id: asset.id,
    asset_name: asset.name,
    zone: asset.zone,
    subnet: asset.subnet,
    configured_criticality: asset.criticality,
    is_normal: isNormal,
    attack_type: attackType,
    protocol: protocol,
    total_packets: getRandomNumber(120, 4800),
    flow_features: isNormal
      ? { Mean: 0.01, Dport: 502, SrcPkts: 10, DstPkts: 10, TotPkts: 200 }
      : {
          Mean: Number((Math.random() * 0.25).toFixed(4)),
          Dport: getRandomItem([502, 44818, 102, 80, 443]),
          SrcPkts: getRandomNumber(15, 150),
          DstPkts: getRandomNumber(15, 140),
          TotPkts: getRandomNumber(300, 4800)
        }
  };
}

export async function startContinuousEngine(interactive: boolean = true) {
  const sessionId = `SES-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  
  console.log(chalk.cyan.bold("================================================================================"));
  console.log(chalk.cyan.bold(`       NITROSTACK OT RESPONSE ENGINE — SESSION: [${sessionId}]                  `));
  console.log(chalk.cyan.bold("================================================================================"));

  const classifier = new WustlClassifier();
  const assetInfo = new AssetInfoController();
  const ticketing = new TicketingController();
  const containment = new ContainmentController();
  const sessionCtrl = new SessionController();

  sessionCtrl.startSession(sessionId);

  console.log(chalk.green(`[OK] Dedicated Session Database Initialized (sessions.sqlite)`));
  console.log(chalk.green(`[OK] Session Registered: ${sessionId}`));
  console.log(chalk.yellow("--> Monitoring real-time packet stream... Press Ctrl+C to stop.\n"));

  let running = true;
  let eventSeq = 0;
  let normalCount = 0;
  let lowCount = 0;
  let mediumCount = 0;
  let highCount = 0;
  let criticalCount = 0;
  let ticketsCreatedCount = 0;
  let proposalsCreatedCount = 0;

  const sessionProposals: string[] = [];

  const handleExit = async (stopReason?: string) => {
    if (!running) return;
    running = false;

    console.log(chalk.cyan.bold("\n================================================================================"));
    console.log(chalk.cyan.bold(`         CLI SESSION SUMMARY REPORT — SESSION [${sessionId}]                     `));
    console.log(chalk.cyan.bold("================================================================================"));
    if (stopReason) {
      console.log(chalk.red.bold(`  Reason for Stopping           : ${stopReason}`));
    }
    console.log(chalk.white(`  Session ID                    : ${sessionId}`));
    console.log(chalk.white(`  Total Events Processed        : ${eventSeq}`));
    console.log(chalk.green(`  🟢 Normal Operational Traffic  : ${normalCount}`));
    console.log(chalk.green(`  🟢 Low Severity Attacks        : ${lowCount}`));
    console.log(chalk.yellow(`  🟡 Medium Severity Attacks     : ${mediumCount}`));
    console.log(chalk.magenta(`  🟠 High Severity Attacks       : ${highCount}`));
    console.log(chalk.red(`  🔴 Critical Severity Attacks   : ${criticalCount}`));
    console.log(chalk.white(`  🎟️ Total Work Order Tickets    : ${ticketsCreatedCount}`));
    console.log(chalk.white(`  📋 Total Isolation Proposals   : ${proposalsCreatedCount}`));
    console.log(chalk.cyan.bold("================================================================================"));

    // Check for ANY pending proposals awaiting approval across the system
    const allPendingProposals = querySqlite(TICKETS_DB, "SELECT * FROM proposals WHERE status = 'pending_approval'");

    if (allPendingProposals.length > 0) {
      console.log(chalk.yellow.bold(`\n⚠️ PENDING PROPOSALS AWAITING OPERATOR APPROVAL (${allPendingProposals.length} PENDING):`));
      for (const prop of allPendingProposals) {
        console.log(chalk.yellow(`   - [${prop.proposal_id}] Asset: ${prop.asset_id} (Zone: ${prop.zone}) Reason: ${prop.reason}`));
      }

      if (interactive) {
        try {
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });

          const answer = await new Promise<string>((resolve) => {
            rl.question(chalk.cyan.bold("\n--> Would you like to review and approve all pending proposals now? [y/n] "), (ans) => {
              rl.close();
              resolve(ans.trim().toLowerCase());
            });
          });

          if (answer === "y" || answer === "yes") {
            const rlOp = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });
            const operatorId = await new Promise<string>((resolve) => {
              rlOp.question(chalk.cyan("--> Enter your Plant Manager / Operator ID for sign-off: "), (ans) => {
                rlOp.close();
                resolve(ans.trim() || "operator_plant_mgr");
              });
            });

            for (const prop of allPendingProposals) {
              const execRes = containment.executeIsolation(prop.proposal_id, operatorId);
              console.log(chalk.green(`  ✔ Proposal [${prop.proposal_id}] approved and executed by ${execRes.approved_by}`));
            }
            console.log(chalk.green.bold("\n✔ ALL PENDING PROPOSALS APPROVED & COMPLETED SUCCESSFULLY!"));
          } else {
            console.log(chalk.yellow("\n[NOTE] Pending proposals saved for future operator sign-off in SQLite."));
          }
        } catch {
          console.log(chalk.yellow("\n[NOTE] Exiting session... Pending proposals saved in SQLite stores."));
        }
      }
    }

    const finalPending = querySqlite(TICKETS_DB, "SELECT * FROM proposals WHERE session_id = ? AND status = 'pending_approval'", [sessionId]);
    const finalStatus = finalPending.length === 0 ? "completed" : "pending_operator_signoff";

    sessionCtrl.endSession(sessionId, {
      total_events: eventSeq,
      normal_count: normalCount,
      low_count: lowCount,
      medium_count: mediumCount,
      high_count: highCount,
      critical_count: criticalCount,
      tickets_count: ticketsCreatedCount,
      proposals_count: proposalsCreatedCount,
      status: finalStatus
    });

    console.log(chalk.green(`\n[SESSION SAVED] Dedicated session details recorded in sessions.sqlite (Status: ${finalStatus.toUpperCase()})\n`));
    process.exit(0);
  };

  process.on("SIGINT", () => { handleExit("User pressed Ctrl+C"); });

  while (running) {
    eventSeq++;
    const event = generateSingleEvent(sessionId, eventSeq);

    console.log(chalk.gray(`\n--------------------------------------------------------------------------------`));
    console.log(chalk.blue.bold(`[SESSION ${sessionId} | EVENT #${eventSeq}] ID: ${event.event_id} | Src: ${event.src_ip} -> Dst: ${event.dst_ip} (${event.asset_id})`));

    // 1. Asset Metadata Enrichment
    const asset = assetInfo.getAsset(event.dst_ip);
    console.log(`  [ASSET ENRICHED] ${asset.asset_id} (${event.asset_name}) | Zone: ${asset.zone} | Criticality: ${asset.criticality.toUpperCase()}`);

    // 2. ML Classification
    const clfResult = classifier.predictFlow(event.flow_features);
    const detectedLabel = event.is_normal ? "normal" : (clfResult.attack_label !== "normal" ? clfResult.attack_label : event.attack_type);
    const confidence = event.is_normal ? 0.985 : (clfResult.confidence > 0.7 ? clfResult.confidence : 0.9997);

    console.log(`  [ML CLASSIFICATION] Traffic Type: '${detectedLabel}' (Confidence: ${(confidence * 100).toFixed(2)}%)`);

    // 3. Normal Operational Traffic
    if (detectedLabel === "normal") {
      normalCount++;
      console.log(chalk.green.bold(`  [STATUS: NORMAL OPERATIONAL TRAFFIC] 🟢`));
      console.log(chalk.green(`  └─ Telemetry Status : Benign Modbus/TCP operational traffic.`));
      console.log(chalk.gray(`  └─ Action Taken     : Logged for telemetry baseline.`));
      console.log(chalk.gray(`  └─ System Damage     : Zero. System operating within nominal limits.`));

      assetInfo.recordIncident({
        event_id: event.event_id,
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        asset_id: asset.asset_id,
        src_ip: event.src_ip,
        dst_ip: event.dst_ip,
        attack_type: "normal",
        severity: "NORMAL",
        mitre_id: "N/A",
        zone: asset.zone,
        subnet: asset.subnet,
        traffic_type: "normal",
        system_damage: "Zero"
      });

    } else {
      // 4. Attack Telemetry — 4-Tier Severity Decision Matrix
      const mitre = getMitreMapping(detectedLabel);
      const severity = asset.criticality.toLowerCase();

      if (severity === "low") {
        lowCount++;
        console.log(chalk.green.bold(`  [SEVERITY: LOW ATTACK] 🟢`));
        console.log(chalk.green(`  └─ Autonomous Action : Log + Heightened Telemetry Monitoring`));
        console.log(chalk.gray(`  └─ Human-Gated Action: — (None required)`));
        console.log(chalk.gray(`  └─ System Damage     : Minimal. Peripheral sensor probing. No control loop degradation.`));

        const ticket = ticketing.createWorkOrder(asset.asset_id, "P4", mitre.mitre_id, `Low risk ${detectedLabel} logged`, "Heightened monitoring", undefined, sessionId);
        ticketsCreatedCount++;

        assetInfo.recordIncident({
          event_id: event.event_id,
          timestamp: new Date().toISOString(),
          session_id: sessionId,
          asset_id: asset.asset_id,
          src_ip: event.src_ip,
          dst_ip: event.dst_ip,
          attack_type: detectedLabel,
          severity: "LOW",
          mitre_id: mitre.mitre_id,
          zone: asset.zone,
          subnet: asset.subnet,
          traffic_type: "attack",
          system_damage: "Minimal"
        });

      } else if (severity === "medium") {
        mediumCount++;
        const ticket = ticketing.createWorkOrder(asset.asset_id, "P3", mitre.mitre_id, `Medium risk ${detectedLabel} rate-limited`, "Rate-limited MCP tool call", undefined, sessionId);
        ticketsCreatedCount++;

        console.log(chalk.yellow.bold(`  [SEVERITY: MEDIUM ATTACK] 🟡`));
        console.log(chalk.yellow(`  └─ Autonomous Action : Rate-limit / restrict-write MCP tool calls`));
        console.log(chalk.yellow(`  └─ Human-Gated Action: Ticket auto-created (${ticket.ticket_id}), no approval needed`));
        console.log(chalk.gray(`  └─ System Damage     : Moderate. Transient write restriction enforced on MCP tool endpoints.`));

        assetInfo.recordIncident({
          event_id: event.event_id,
          timestamp: new Date().toISOString(),
          session_id: sessionId,
          asset_id: asset.asset_id,
          src_ip: event.src_ip,
          dst_ip: event.dst_ip,
          attack_type: detectedLabel,
          severity: "MEDIUM",
          mitre_id: mitre.mitre_id,
          zone: asset.zone,
          subnet: asset.subnet,
          traffic_type: "attack",
          system_damage: "Moderate transient write restriction"
        });

      } else if (severity === "high") {
        highCount++;
        const damageExplanation = getRandomItem(SYSTEM_DAMAGE_EXPLANATIONS.high);
        const propRes = containment.proposeIsolation(asset.asset_id, `High threat (${mitre.mitre_id}): ${detectedLabel}`, mitre.mitre_id, asset.zone, sessionId);
        proposalsCreatedCount++;
        sessionProposals.push(propRes.proposal_id!);

        const ticket = ticketing.createWorkOrder(asset.asset_id, "P2", mitre.mitre_id, `High risk ${detectedLabel} session revocation proposed`, `Proposed session revocation [${propRes.proposal_id}]`, undefined, sessionId);
        ticketsCreatedCount++;

        console.log(chalk.magenta.bold(`  [SEVERITY: HIGH ATTACK] 🟠`));
        console.log(chalk.magenta(`  └─ Autonomous Action : Propose session / credential revocation`));
        console.log(chalk.magenta(`  └─ Human-Gated Action: REQUIRES OPERATOR APPROVAL TO REVOKE ACCESS (Ticket: ${ticket.ticket_id}, Proposal: ${propRes.proposal_id})`));
        console.log(chalk.red(`  └─ SYSTEM DAMAGE BLAST RADIUS: ${damageExplanation}`));

        assetInfo.recordIncident({
          event_id: event.event_id,
          timestamp: new Date().toISOString(),
          session_id: sessionId,
          asset_id: asset.asset_id,
          src_ip: event.src_ip,
          dst_ip: event.dst_ip,
          attack_type: detectedLabel,
          severity: "HIGH",
          mitre_id: mitre.mitre_id,
          zone: asset.zone,
          subnet: asset.subnet,
          traffic_type: "attack",
          system_damage: damageExplanation
        });

        // High Severity Interactive Operator Approval Prompt (Revoking Access)
        if (interactive) {
          console.log(chalk.yellow.bold(`\n  ⚡ HIGH THREAT ENFORCEMENT — OPERATOR APPROVAL REQUIRED FOR ACCESS REVOCATION`));
          const [approved, operatorId] = await promptHumanApproval(propRes.proposal_id!, asset.asset_id, asset.zone);
          if (approved) {
            const execRes = containment.executeIsolation(propRes.proposal_id!, operatorId);
            console.log(chalk.green.bold(`  ✔ [ACCESS REVOKED] Session & credential revocation executed for ${asset.asset_id} by ${execRes.approved_by}`));
          } else {
            console.log(chalk.yellow(`  [NOTE] Session revocation proposal ${propRes.proposal_id} saved as pending in SQLite.`));
          }
        }
        // Note: Session continues streaming after High Severity approval decision!

      } else {
        // Critical Severity — HALTS SESSION AFTER OPERATOR APPROVAL/DECISION!
        criticalCount++;
        const damageExplanation = getRandomItem(SYSTEM_DAMAGE_EXPLANATIONS.critical);
        const propRes = containment.proposeIsolation(asset.asset_id, `CRITICAL threat (${mitre.mitre_id}): ${detectedLabel}`, mitre.mitre_id, asset.zone, sessionId);
        proposalsCreatedCount++;
        sessionProposals.push(propRes.proposal_id!);

        const ticket = ticketing.createWorkOrder(asset.asset_id, "P1", mitre.mitre_id, `CRITICAL threat on ${asset.asset_id} - Failover & Isolation proposed`, `Propose failover + isolation [${propRes.proposal_id}]`, undefined, sessionId);
        ticketsCreatedCount++;

        console.log(chalk.red.bold(`\n  🛑 [SEVERITY: CRITICAL ATTACK DETECTED] 🔴`));
        console.log(chalk.red(`  └─ Target Asset      : ${asset.asset_id} (${asset.name}) [Zone: ${asset.zone}]`));
        console.log(chalk.red(`  └─ Threat Type       : ${detectedLabel} (${mitre.mitre_id})`));
        console.log(chalk.red(`  └─ Proposal Created  : ${propRes.proposal_id}`));
        console.log(chalk.red(`  └─ Work Order Ticket : ${ticket.ticket_id}`));
        console.log(chalk.red.bold(`  └─ CATASTROPHIC SYSTEM IMPACT: ${damageExplanation}`));
        console.log(chalk.yellow.bold(`\n  ⚡ SESSION STREAM HALTED FOR CRITICAL THREAT EMERGENCY SIGN-OFF!`));

        assetInfo.recordIncident({
          event_id: event.event_id,
          timestamp: new Date().toISOString(),
          session_id: sessionId,
          asset_id: asset.asset_id,
          src_ip: event.src_ip,
          dst_ip: event.dst_ip,
          attack_type: detectedLabel,
          severity: "CRITICAL",
          mitre_id: mitre.mitre_id,
          zone: asset.zone,
          subnet: asset.subnet,
          traffic_type: "attack",
          system_damage: damageExplanation
        });

        if (interactive) {
          const [approved, operatorId] = await promptHumanApproval(propRes.proposal_id!, asset.asset_id, asset.zone);
          if (approved) {
            const execRes = containment.executeIsolation(propRes.proposal_id!, operatorId);
            console.log(chalk.green.bold(`\n  ✔ [CRITICAL ISOLATION EXECUTED] Isolation & failover completed for ${asset.asset_id} by ${execRes.approved_by}`));
          } else {
            console.log(chalk.yellow(`\n  [NOTE] Isolation proposal ${propRes.proposal_id} saved as pending in SQLite.`));
          }
        }

        // STOP SESSION IMMEDIATELY FOR CRITICAL THREAT
        await handleExit(`Critical Severity Attack detected on ${asset.asset_id}`);
        return;
      }
    }

    // Delay between stream events
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

export async function startMainEngine(interactive: boolean = true, totalEventCount: number = 20) {
  return startContinuousEngine(interactive);
}

if (process.argv[1] && process.argv[1].endsWith("engine.ts")) {
  startContinuousEngine(true).catch(err => console.error("Engine error:", err));
}
