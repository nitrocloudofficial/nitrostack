import { ToolDecorator as Tool, UseInterceptors, ExecutionContext, z } from "@nitrostack/core";
import { InvestigationTraceInterceptor } from "../investigation/investigation.interceptor.js";
import { checkSpf, checkDmarc, checkDkim } from "./dns-checks.js";

export class DnscheckTools {
  @Tool({
    name: "check_domain_security",
    description:
      "Checks a domain's email-spoofing defenses via DNS TXT lookups only (Node's built-in `dns` module, no " +
      "API key, no mail sent): SPF (root domain), DMARC (_dmarc.<domain>), and DKIM (a curated list of common " +
      "provider selectors — DKIM selectors aren't discoverable via DNS, so a miss there is inconclusive, not a " +
      "confirmed absence). Returns per-check findings and an overall risk_level.",
    inputSchema: z.object({
      domain: z.string().describe("The domain to check, e.g. example.com (no scheme, no path)."),
    }),
  })
  @UseInterceptors(InvestigationTraceInterceptor)
  async checkDomainSecurity(input: { domain: string }, _ctx: ExecutionContext) {
    const domain = input.domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
    if (!domain || /\s/.test(domain)) {
      throw new Error(`Invalid domain: ${input.domain}`);
    }

    const [spf, dmarc, dkim] = await Promise.all([checkSpf(domain), checkDmarc(domain), checkDkim(domain)]);

    if (spf.lookup_failed && dmarc.lookup_failed) {
      return {
        domain,
        risk_level: "UNKNOWN" as const,
        spf,
        dmarc,
        dkim,
        note:
          "DNS TXT lookups failed for both SPF and DMARC — this environment could not reach a DNS resolver " +
          "(e.g. outbound UDP/53 is blocked), not that the domain has no records. No risk conclusion can be " +
          "drawn; re-run from a network with normal DNS egress.",
      };
    }

    const highSeverityMisses = (!spf.found && !spf.lookup_failed ? 1 : 0) + (!dmarc.found && !dmarc.lookup_failed ? 1 : 0);
    const riskLevel =
      highSeverityMisses === 2
        ? "CRITICAL"
        : highSeverityMisses === 1 || dmarc.policy === "none"
          ? "HIGH"
          : spf.warnings.length > 0 || dmarc.warnings.length > 0
            ? "MEDIUM"
            : "LOW";

    return {
      domain,
      risk_level: riskLevel,
      spf,
      dmarc,
      dkim,
      note:
        "SPF and DMARC absence/misconfiguration is a confirmed finding — both live at well-known DNS names. " +
        "DKIM is best-effort only; treat 'any_found: false' as 'not found under common selectors,' not proof " +
        "DKIM is unconfigured. If lookup_failed is true on any check, the resolver itself was unreachable and " +
        "that check's result should be ignored, not treated as a finding.",
    };
  }
}
