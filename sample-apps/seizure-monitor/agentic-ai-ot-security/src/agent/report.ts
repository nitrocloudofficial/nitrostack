/**
 * Plant Manager Incident Report Drafting Module
 * Converted from ot-responder/agent/report.py
 */

export interface IncidentReportParams {
  eventId: string;
  assetId: string;
  zone: string;
  criticality: string;
  mitreId: string;
  techniqueName: string;
  mitreTactic: string;
  attackType: string;
  protocol: string;
  totalPackets: number;
  campaignContext: string;
  dataLossEstimate: string;
  decisionSummary: string;
  reason: string;
  ticketId: string;
}

/**
 * Drafts a plant-manager-readable incident report.
 */
export function draftIncidentReport(params: IncidentReportParams): string {
  const {
    eventId, assetId, zone, criticality, mitreId, techniqueName, mitreTactic,
    attackType, protocol, totalPackets, campaignContext, dataLossEstimate,
    decisionSummary, reason, ticketId
  } = params;

  const capCriticality = criticality.charAt(0).toUpperCase() + criticality.slice(1);
  const formattedPackets = totalPackets.toLocaleString();

  const report = `
================================================================================
                    OT SECURITY INCIDENT REPORT (PLANT MANAGER)
================================================================================
Incident ${eventId} — ${assetId} (${zone}, ${capCriticality})
MITRE: ${mitreId} ${techniqueName} (Tactic: ${mitreTactic})

What happened:
  Anomalous ${attackType} traffic (${protocol}) was detected targeting asset ${assetId}.
  A total of ${formattedPackets} packets were transferred.

Campaign context:
  ${campaignContext}

Data impact:
  ${dataLossEstimate}

Decision:
  ${decisionSummary} — ${reason}

Ticket Reference:
  ${ticketId}
================================================================================
`;
  return report.trim();
}
