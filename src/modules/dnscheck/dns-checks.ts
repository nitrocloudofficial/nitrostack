/**
 * SPF / DMARC / DKIM hygiene checks via Node's built-in `dns` module —
 * no API key, no external service. TXT-record lookups only; this never
 * sends mail or touches a mailbox.
 *
 * HONEST LIMITATION on DKIM: a DKIM public key lives at
 * `<selector>._domainkey.<domain>`, and the selector is chosen by whoever
 * configured the domain — there is no DNS record that announces it. This
 * checks a curated list of common selectors (mail providers' defaults) and
 * reports what it finds, but a "not found" result means "not found under
 * these common selectors," not "this domain has no DKIM." That distinction
 * is preserved all the way into the tool's response, not glossed over.
 */

import { promises as dns } from "node:dns";

export interface SpfResult {
  found: boolean;
  records: string[];
  multiple_records: boolean;
  all_mechanism: string | null;
  lookup_failed: boolean;
  warnings: string[];
}

export interface DmarcResult {
  found: boolean;
  record: string | null;
  policy: "none" | "quarantine" | "reject" | null;
  lookup_failed: boolean;
  warnings: string[];
}

export interface DkimSelectorResult {
  selector: string;
  found: boolean;
  record: string | null;
}

export interface DkimResult {
  checked_selectors: string[];
  results: DkimSelectorResult[];
  any_found: boolean;
  lookup_failed: boolean;
  note: string;
}

const COMMON_DKIM_SELECTORS = ["default", "google", "selector1", "selector2", "k1", "mail", "dkim", "smtp"];

/**
 * NODATA/ENOTFOUND from Node's `dns` module mean "this name has no such
 * record" — a real, reportable result. Anything else (ECONNREFUSED,
 * ETIMEOUT, SERVFAIL, ...) means the *lookup itself* failed — the resolver
 * was unreachable, not that the record is absent. Conflating the two would
 * make a blocked/offline resolver look identical to "no SPF configured,"
 * which is a false finding, not a missing one.
 */
async function resolveTxtFlat(hostname: string): Promise<{ records: string[]; failed: boolean; error?: string }> {
  try {
    const records = await dns.resolveTxt(hostname);
    return { records: records.map((chunks) => chunks.join("")), failed: false };
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code?: unknown }).code) : undefined;
    if (code === "ENOTFOUND" || code === "ENODATA") return { records: [], failed: false };
    return { records: [], failed: true, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function checkSpf(domain: string): Promise<SpfResult> {
  const { records: all, failed, error } = await resolveTxtFlat(domain);
  const warnings: string[] = [];

  if (failed) {
    warnings.push(`SPF lookup failed (${error}) — could not determine whether SPF is configured. This is not a "missing SPF" finding.`);
    return { found: false, records: [], multiple_records: false, all_mechanism: null, lookup_failed: true, warnings };
  }

  const spfRecords = all.filter((r) => r.toLowerCase().startsWith("v=spf1"));
  if (spfRecords.length === 0) {
    warnings.push("No SPF record found — nothing prevents other servers from spoofing mail 'from' this domain.");
    return { found: false, records: [], multiple_records: false, all_mechanism: null, lookup_failed: false, warnings };
  }
  if (spfRecords.length > 1) {
    warnings.push("Multiple SPF records found — RFC 7208 requires exactly one; mail servers may treat this as a permanent SPF failure.");
  }

  const allMatch = spfRecords[0].match(/([~+?-])all\b/);
  const allMechanism = allMatch ? `${allMatch[1]}all` : null;
  if (allMechanism === "+all") warnings.push("SPF ends in '+all' — this explicitly allows ANY server to send as this domain, effectively disabling SPF.");
  else if (!allMechanism) warnings.push("SPF record has no 'all' mechanism — behaviour for non-matching senders is undefined by this record.");

  return { found: true, records: spfRecords, multiple_records: spfRecords.length > 1, all_mechanism: allMechanism, lookup_failed: false, warnings };
}

export async function checkDmarc(domain: string): Promise<DmarcResult> {
  const { records: all, failed, error } = await resolveTxtFlat(`_dmarc.${domain}`);
  const warnings: string[] = [];

  if (failed) {
    warnings.push(`DMARC lookup failed (${error}) — could not determine whether DMARC is configured. This is not a "missing DMARC" finding.`);
    return { found: false, record: null, policy: null, lookup_failed: true, warnings };
  }

  const dmarcRecord = all.find((r) => r.toLowerCase().startsWith("v=dmarc1")) ?? null;
  if (!dmarcRecord) {
    warnings.push("No DMARC record found at _dmarc." + domain + " — spoofed mail claiming to be from this domain has no enforcement policy to fail against.");
    return { found: false, record: null, policy: null, lookup_failed: false, warnings };
  }

  const policyMatch = dmarcRecord.match(/p=(none|quarantine|reject)/i);
  const policy = (policyMatch?.[1].toLowerCase() as DmarcResult["policy"]) ?? null;
  if (policy === "none") warnings.push("DMARC policy is 'p=none' — monitoring only; spoofed mail is reported but not rejected or quarantined.");
  else if (!policy) warnings.push("DMARC record found but has no parseable 'p=' policy tag.");

  return { found: true, record: dmarcRecord, policy, lookup_failed: false, warnings };
}

export async function checkDkim(domain: string, selectors: string[] = COMMON_DKIM_SELECTORS): Promise<DkimResult> {
  const lookups = await Promise.all(
    selectors.map(async (selector) => {
      const { records, failed } = await resolveTxtFlat(`${selector}._domainkey.${domain}`);
      const record = records.find((r) => /v=dkim1|p=/i.test(r)) ?? null;
      return { selector, found: record !== null, record, failed };
    })
  );

  const lookupFailed = lookups.every((r) => r.failed);
  const results: DkimSelectorResult[] = lookups.map(({ selector, found, record }) => ({ selector, found, record }));

  return {
    checked_selectors: selectors,
    results,
    any_found: results.some((r) => r.found),
    lookup_failed: lookupFailed,
    note: lookupFailed
      ? "DNS lookups failed for every selector checked — could not determine DKIM status at all, this is not a \"no DKIM\" finding."
      : "DKIM selectors are chosen by whoever configured the domain and aren't discoverable via DNS — this only " +
        "checks a curated list of common provider defaults. A 'not found' result means 'not found under these " +
        "selectors,' not 'this domain has no DKIM.'",
  };
}
