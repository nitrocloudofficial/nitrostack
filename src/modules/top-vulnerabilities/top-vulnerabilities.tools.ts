/**
 * MCP tools for managing top 3 vulnerabilities.
 * Provides list, update, and delete operations.
 */

import { ToolDecorator as Tool, ExecutionContext, z } from "@nitrostack/core";
import {
  upsertTopVulnerability,
  getTopVulnerabilities,
  getTopVulnerabilityByRank,
  deleteTopVulnerability,
  type VulnerabilitySeverity,
} from "./top-vulnerabilities.service.js";

const VulnerabilitySeverityValues = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

export class TopVulnerabilitiesTools {
  @Tool({
    name: "list_top_vulnerabilities",
    description: "Retrieve all top 3 vulnerabilities from the database, sorted by rank",
    inputSchema: z.object({}),
  })
  async listTopVulnerabilities(input: Record<string, unknown>, ctx: ExecutionContext) {
    try {
      const vulnerabilities = await getTopVulnerabilities();
      ctx.logger.info(`Retrieved ${vulnerabilities.length} top vulnerabilities`);
      const result = {
        vulnerabilities: vulnerabilities as unknown as any,
        count: vulnerabilities.length,
      } satisfies Record<string, any>;
      return result;
    } catch (error) {
      ctx.logger.error("Failed to list top vulnerabilities", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  @Tool({
    name: "update_top_vulnerability",
    description: "Update or create a top vulnerability at a specific rank (1, 2, or 3)",
    inputSchema: z.object({
      rank: z.number().int().min(1).max(3).describe("Vulnerability rank (1, 2, or 3)"),
      cve_id: z.string().describe("CVE identifier (e.g., CVE-2024-1234)"),
      title: z.string().describe("Vulnerability title"),
      description: z.string().describe("Detailed description of the vulnerability"),
      severity: z.enum(VulnerabilitySeverityValues).describe("Severity level"),
      cvss_score: z.number().min(0).max(10).describe("CVSS score (0-10)"),
      affected_systems: z.array(z.string()).optional().describe("List of affected systems"),
      remediation_steps: z.array(z.string()).optional().describe("Steps to remediate the vulnerability"),
      references: z.array(z.string()).optional().describe("Reference URLs"),
    }),
  })
  async updateTopVulnerability(
    input: {
      rank: number;
      cve_id: string;
      title: string;
      description: string;
      severity: (typeof VulnerabilitySeverityValues)[number];
      cvss_score: number;
      affected_systems?: string[];
      remediation_steps?: string[];
      references?: string[];
    },
    ctx: ExecutionContext
  ) {
    try {
      const result = await upsertTopVulnerability({
        rank: input.rank,
        cve_id: input.cve_id,
        title: input.title,
        description: input.description,
        severity: input.severity as VulnerabilitySeverity,
        cvss_score: input.cvss_score,
        affected_systems: input.affected_systems,
        remediation_steps: input.remediation_steps,
        references: input.references,
      });
      const action = result.is_new ? "created" : "updated";
      ctx.logger.info(`Top vulnerability rank ${input.rank} ${action}`, { cve_id: input.cve_id });
      const returnValue = {
        vulnerability: result.vulnerability as unknown as any,
        is_new: result.is_new,
      } satisfies Record<string, any>;
      return returnValue;
    } catch (error) {
      ctx.logger.error("Failed to update top vulnerability", {
        error: error instanceof Error ? error.message : String(error),
        rank: input.rank,
      });
      throw error;
    }
  }

  @Tool({
    name: "get_top_vulnerability",
    description: "Retrieve a specific top vulnerability by rank",
    inputSchema: z.object({
      rank: z.number().int().min(1).max(3).describe("Vulnerability rank (1, 2, or 3)"),
    }),
  })
  async getTopVulnerability(input: { rank: number }, ctx: ExecutionContext) {
    try {
      const vulnerability = await getTopVulnerabilityByRank(input.rank);
      if (vulnerability) {
        ctx.logger.info(`Retrieved top vulnerability rank ${input.rank}`, { cve_id: vulnerability.cve_id });
      } else {
        ctx.logger.info(`No vulnerability found at rank ${input.rank}`);
      }
      const returnValue = {
        vulnerability: vulnerability as unknown as any,
      } satisfies Record<string, any>;
      return returnValue;
    } catch (error) {
      ctx.logger.error("Failed to get top vulnerability", {
        error: error instanceof Error ? error.message : String(error),
        rank: input.rank,
      });
      throw error;
    }
  }

  @Tool({
    name: "delete_top_vulnerability",
    description: "Delete a top vulnerability at a specific rank",
    inputSchema: z.object({
      rank: z.number().int().min(1).max(3).describe("Vulnerability rank (1, 2, or 3)"),
    }),
  })
  async deleteTopVulnerability(input: { rank: number }, ctx: ExecutionContext) {
    try {
      const deleted = await deleteTopVulnerability(input.rank);
      if (deleted) {
        ctx.logger.info(`Deleted top vulnerability rank ${input.rank}`);
        const returnValue = {
          success: true as unknown as any,
          message: `Top vulnerability rank ${input.rank} deleted successfully`,
        } satisfies Record<string, any>;
        return returnValue;
      } else {
        ctx.logger.info(`No vulnerability found at rank ${input.rank} to delete`);
        const returnValue = {
          success: false as unknown as any,
          message: `No vulnerability found at rank ${input.rank}`,
        } satisfies Record<string, any>;
        return returnValue;
      }
    } catch (error) {
      ctx.logger.error("Failed to delete top vulnerability", {
        error: error instanceof Error ? error.message : String(error),
        rank: input.rank,
      });
      throw error;
    }
  }
}
