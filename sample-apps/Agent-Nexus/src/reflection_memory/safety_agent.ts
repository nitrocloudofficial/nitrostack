import { Proposal, SOPRule, SafetyVerdict, VerdictType, SOPCategory } from "./models.js";

export class SafetyAgent {
  public agentId: string;
  public rules: SOPRule[];

  constructor(agentId: string = "SafetyAgent_01", rules?: SOPRule[]) {
    this.agentId = agentId;
    this.rules = rules || this._getDefaultSopRules();
  }

  private _getDefaultSopRules(): SOPRule[] {
    return [
      {
        rule_id: "SOP-BUDGET-01",
        name: "Maximum Single Proposal Budget Cap",
        category: SOPCategory.BUDGET,
        max_threshold: 50000.0,
        remediation_advice: "Reduce proposed equipment budget allocation to $50,000 or below."
      },
      {
        rule_id: "SOP-OPS-02",
        name: "High Production Throughput Interlock Enforcement",
        category: SOPCategory.OPERATIONAL_BLAST_RADIUS,
        prohibited_actions: ["no_auto_failover", "disable_replicas"],
        remediation_advice: "Enable automated safety interlock and redundant conveyor sensor feeds."
      },
      {
        rule_id: "SOP-SEC-03",
        name: "Unverified High-Risk Machine Operation Prohibition",
        category: SOPCategory.SECURITY,
        prohibited_actions: ["skip_load_testing", "bypass_security_scan"],
        remediation_advice: "Include valid machine load testing evidence and safety inspection reports."
      }
    ];
  }

  public validateProposal(proposal: Proposal): SafetyVerdict {
    const violatedRules: string[] = [];
    const remediations: string[] = [];
    let hasHardVeto = false;

    const params = proposal.parameters || {};

    // 1. Budget Cap Rule Check
    const budget = Number(params["budget_allocation"] ?? 0.0);
    for (const rule of this.rules) {
      if (rule.category === SOPCategory.BUDGET && rule.max_threshold !== undefined) {
        if (budget > rule.max_threshold) {
          violatedRules.push(
            `${rule.rule_id} (${rule.name}): Proposed budget ($${budget.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) exceeds max allowed threshold ($${rule.max_threshold.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`
          );
          remediations.push(rule.remediation_advice);
          hasHardVeto = true;
        }
      }
    }

    // 2. Operational Prohibited Actions Check
    const prohibitedInProposal: string[] = [...(params["prohibited_flags"] || [])];
    if (params["auto_failover"] === false) {
      prohibitedInProposal.push("no_auto_failover");
    }
    if (params["skip_load_testing"] === true) {
      prohibitedInProposal.push("skip_load_testing");
    }

    for (const rule of this.rules) {
      const prohibited = rule.prohibited_actions || [];
      for (const action of prohibited) {
        if (prohibitedInProposal.includes(action)) {
          violatedRules.push(
            `${rule.rule_id} (${rule.name}): Prohibited operational flag '${action}' detected.`
          );
          remediations.push(rule.remediation_advice);
          if (
            rule.category === SOPCategory.OPERATIONAL_BLAST_RADIUS ||
            rule.category === SOPCategory.SECURITY
          ) {
            hasHardVeto = true;
          }
        }
      }
    }

    // 3. Formulate Verdict
    let verdictType: VerdictType;
    let details: string;

    if (hasHardVeto) {
      verdictType = VerdictType.HARD_VETO;
      details = `HARD VETO ISSUED: Proposal '${proposal.title}' violates ${violatedRules.length} critical SOP rule(s).`;
    } else if (violatedRules.length > 0) {
      verdictType = VerdictType.CONDITIONAL_APPROVAL;
      details = `CONDITIONAL APPROVAL: Proposal requires remediation before deployment.`;
    } else {
      verdictType = VerdictType.APPROVED;
      details = `SAFETY APPROVED: Proposal '${proposal.title}' complies with all standard operating procedures.`;
    }

    return {
      verdict: verdictType,
      violated_rules: violatedRules,
      remediation_required: remediations,
      details: details
    };
  }
}
