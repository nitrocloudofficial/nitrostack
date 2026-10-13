/**
 * OT Security Orchestrator Core Module
 * Converted from ot-responder/agent/orchestrator.py
 */

import {
  AssetInfoController,
  TicketingController,
  NotificationController,
  ContainmentController
} from "../mcp_servers/mcp_servers.js";
import { getMitreMapping } from "./mitre.js";
import { draftIncidentReport } from "./report.js";
import { promptHumanApproval } from "../cli/approval.js";

export interface AnomalyEvent {
  event_id: string;
  src_ip: string;
  dst_ip: string;
  attack_type: string;
  protocol?: string;
  total_packets?: number;
  src_port?: number;
  dst_port?: number;
}

export interface OrchestratorResult {
  event_id: string;
  asset_id: string;
  criticality: string;
  priority: string;
  status: string;
  ticket_id: string;
  proposal_id: string | null;
  action_taken_or_proposed: string;
}

export class OtSecurityOrchestrator {
  private assetInfo: AssetInfoController;
  private ticketing: TicketingController;
  private notification: NotificationController;
  private containment: ContainmentController;

  constructor() {
    this.assetInfo = new AssetInfoController();
    this.ticketing = new TicketingController();
    this.notification = new NotificationController();
    this.containment = new ContainmentController();
  }

  /**
   * Executes the orchestrator perceive -> decide -> act -> verify loop.
   */
  public async processAnomalyEvent(
    event: AnomalyEvent,
    interactiveHumanApproval: boolean = false
  ): Promise<[OrchestratorResult, string]> {
    const eventId = event.event_id;
    const srcIp = event.src_ip;
    const dstIp = event.dst_ip;
    const attackType = event.attack_type;
    const protocol = event.protocol || "Modbus/TCP";
    const totalPackets = event.total_packets || 1187;

    // 1. ENRICH
    const asset = this.assetInfo.getAsset(dstIp);
    const assetId = asset.asset_id || dstIp;
    const criticality = (asset.criticality || "critical").toLowerCase();
    const zone = asset.zone || "Zone 2";
    const subnet = asset.subnet || "10.0.4.0/24";

    // 2. CORRELATE
    const campaignEvents = this.assetInfo.correlateCampaign(zone, subnet, 15, srcIp);
    let campaignSummary = "Isolated event";
    let campaignId: string | undefined = undefined;

    if (campaignEvents.length > 1) {
      const eventIds = campaignEvents.filter(e => e.event_id !== eventId).map(e => e.event_id);
      campaignSummary = `Linked to ${eventIds.join(", ")} (${campaignEvents.length} assets in 8 min)`;
      campaignId = `CAMP-Z2-${srcIp.replace(/\./g, "")}`;
    }

    // 3. CLASSIFY (MITRE ATT&CK for ICS)
    const mitreInfo = getMitreMapping(attackType);
    const mitreId = mitreInfo.mitre_id;
    const mitreTactic = mitreInfo.mitre_tactic;
    const techniqueName = mitreInfo.technique_name;

    const dataLossEstimate = ["reconn", "scanning", "reconnaissance"].includes(attackType.toLowerCase())
      ? "None observed (read-only scan)"
      : "Potential unauthorized command injection";

    // 4. DECIDE & ACT (CRITICALITY BRANCHING - IDEAS 1 & 2 INTEGRATED)
    let priority = "P3";
    let status = "resolved";
    let actionTakenOrProposed = "";
    let decisionSummary = "";
    let proposalId: string | null = null;
    let reason = "";

    if (["low", "medium"].includes(criticality)) {
      priority = criticality === "low" ? "P3" : "P2";
      reason = `Early-stage ${mitreTactic} threat (${mitreId} ${techniqueName}) on node ${assetId} (${criticality.toUpperCase()}, ${zone}). Low production downtime risk permits immediate automated switch ACL containment without disrupting physical plant operations.`;

      const remRes = this.containment.autoRemediate(assetId, attackType, mitreId, reason);
      actionTakenOrProposed = `Auto-Remediated: ${remRes.action_taken}`;
      decisionSummary = "Autonomous action taken";
      status = "resolved";
    } else {
      priority = "P1";
      status = "pending_approval";
      reason = `Direct threat (${mitreId} ${techniqueName}) targeting core process controller ${assetId} (${criticality.toUpperCase()}, ${zone}). High blast-radius risk of process disruption or plant trip. Automated isolation halted; mandatory human operator sign-off required.`;

      const propRes = this.containment.proposeIsolation(assetId, reason, mitreId);
      proposalId = propRes.proposal_id || null;
      actionTakenOrProposed = `Proposed: Isolate ${assetId} from ${zone} subnet [Proposal ${proposalId}]`;
      decisionSummary = `Proposal pending approval (${proposalId})`;

      if (interactiveHumanApproval && proposalId) {
        const [approved, operator] = await promptHumanApproval(proposalId, assetId, zone);
        if (approved) {
          this.containment.executeIsolation(proposalId, operator);
          status = "executed";
          actionTakenOrProposed = `EXECUTED: Isolate ${assetId} from ${zone} (Approved by ${operator})`;
          decisionSummary = `Human-approved isolation executed (${proposalId})`;
        } else {
          status = "rejected";
          actionTakenOrProposed = `REJECTED: Isolation proposal ${proposalId} declined by human operator`;
          decisionSummary = `Human rejected isolation proposal (${proposalId})`;
        }
      }
    }

    // 5. TICKET
    const ticket = this.ticketing.createWorkOrder(
      assetId,
      priority,
      mitreId,
      `${attackType} on ${assetId} (${criticality})`,
      actionTakenOrProposed,
      campaignId
    );
    const ticketId = ticket.ticket_id;

    // 6. NOTIFY
    const notifyPayload = {
      event_id: eventId,
      asset_id: assetId,
      criticality,
      zone,
      subnet,
      mitre_id: mitreId,
      mitre_tactic: mitreTactic,
      technique_name: techniqueName,
      attack_type: attackType,
      protocol,
      src_ip: srcIp,
      src_port: event.src_port || 51422,
      dst_ip: dstIp,
      dst_port: event.dst_port || 502,
      total_packets: totalPackets,
      data_loss_estimate: dataLossEstimate,
      campaign_summary: campaignSummary,
      action_taken_or_proposed: actionTakenOrProposed
    };

    this.notification.notify("plant_manager", priority, status, notifyPayload);

    // 7. DRAFT REPORT
    const report = draftIncidentReport({
      eventId,
      assetId,
      zone,
      criticality,
      mitreId,
      techniqueName,
      mitreTactic,
      attackType,
      protocol,
      totalPackets,
      campaignContext: campaignSummary,
      dataLossEstimate,
      decisionSummary,
      reason,
      ticketId
    });

    const result: OrchestratorResult = {
      event_id: eventId,
      asset_id: assetId,
      criticality,
      priority,
      status,
      ticket_id: ticketId,
      proposal_id: proposalId,
      action_taken_or_proposed: actionTakenOrProposed
    };

    return [result, report];
  }
}
