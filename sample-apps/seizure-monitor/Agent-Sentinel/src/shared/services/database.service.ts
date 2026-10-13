import type { Agent } from "../../database/schema/agents.schema.ts";
import type { Incident } from "../../database/schema/incidents.schema.ts";
import type { Policy } from "../../database/schema/policies.schema.ts";
import type { AuditLog } from "../../database/schema/audit.schema.ts";
import type { Report } from "../../database/schema/reports.schema.ts";

export class DatabaseService {

  private readonly agents = new Map<string, Agent>();

  private readonly incidents = new Map<string, Incident>();

  private readonly policies = new Map<string, Policy>();

  private readonly auditLogs = new Map<string, AuditLog>();

  private readonly reports = new Map<string, Report>();


  //----------------------------
  // AGENTS
  //----------------------------

  getAgents(): Agent[] {
    return [...this.agents.values()];
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  saveAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  removeAgent(id: string): void {
    this.agents.delete(id);
  }


  //----------------------------
  // INCIDENTS
  //----------------------------

  getIncidents(): Incident[] {
    return [...this.incidents.values()];
  }

  saveIncident(incident: Incident): void {
    this.incidents.set(incident.id, incident);
  }


  //----------------------------
  // POLICIES
  //----------------------------

  getPolicies(): Policy[] {
    return [...this.policies.values()];
  }

  savePolicy(policy: Policy): void {
    this.policies.set(policy.id, policy);
  }


  //----------------------------
  // AUDIT
  //----------------------------

  getAuditLogs(): AuditLog[] {
    return [...this.auditLogs.values()];
  }

  saveAuditLog(log: AuditLog): void {
    this.auditLogs.set(log.id, log);
  }


  //----------------------------
  // REPORTS
  //----------------------------

  getReports(): Report[] {
    return [...this.reports.values()];
  }

  saveReport(report: Report): void {
    this.reports.set(report.id, report);
  }


  //----------------------------
  // DASHBOARD SUMMARY
  //----------------------------

  getStatistics() {

    return {

      agents: this.agents.size,

      incidents: this.incidents.size,

      policies: this.policies.size,

      auditLogs: this.auditLogs.size,

      reports: this.reports.size

    };

  }

}