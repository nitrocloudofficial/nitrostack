/**
 * WARDEN's core thesis, expressed as code: rank by evidence of real-world
 * exploitation, not by theoretical CVSS severity.
 *
 *   1. On KEV AND ransomware-linked -> CRITICAL
 *   2. On KEV                        -> HIGH
 *   3. EPSS >= 0.5                   -> HIGH
 *   4. EPSS >= 0.1                   -> MEDIUM
 *   5. CVSS >= 9.0 but EPSS < 0.05 and not on KEV -> LOW  (the surprise)
 *   6. everything else               -> LOW
 *
 * OSV rarely exposes a plain numeric CVSS base score (its severity[].score
 * is usually a raw vector string like "CVSS:3.1/AV:N/AC:L/..."), so `cvss`
 * is null far more often here than it was against NVD in v1. That's fine —
 * it's the whole point of this ranking: KEV and EPSS evidence carry the
 * decision, CVSS is corroborating color when available, never required.
 */

export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface PriorityInput {
  cveId: string;
  cvss: number | null;
  inKev: boolean;
  ransomwareLinked: boolean;
  epss: number | null;
}

export interface PriorityResult {
  priority: Priority;
  why: string;
}

export function rankPriority(input: PriorityInput): PriorityResult {
  const { cvss, inKev, ransomwareLinked, epss } = input;
  const cvssStr = cvss !== null ? cvss.toFixed(1) : "unknown";
  const epssStr = epss !== null ? `${Math.round(epss * 100)}%` : "unknown";

  if (inKev && ransomwareLinked) {
    return {
      priority: "CRITICAL",
      why: `On CISA's confirmed-exploited list AND linked to ransomware campaigns${
        epss !== null ? `, with a ${epssStr} chance of exploitation in the next 30 days` : ""
      }. CVSS is ${cvssStr} but that's not why this matters — active ransomware use is. Patch today.`,
    };
  }

  if (inKev) {
    return {
      priority: "HIGH",
      why: `On CISA's confirmed-exploited list — attackers are using this in the real world right now, regardless of the ${cvssStr} CVSS score. Prioritise over unexploited "critical" bugs.`,
    };
  }

  if (epss !== null && epss >= 0.5) {
    return {
      priority: "HIGH",
      why: `Not (yet) on the confirmed-exploited list, but EPSS puts the chance of exploitation in the next 30 days at ${epssStr} — high enough to treat as an active threat. CVSS is ${cvssStr}.`,
    };
  }

  if (epss !== null && epss >= 0.1) {
    return {
      priority: "MEDIUM",
      why: `EPSS gives a ${epssStr} chance of exploitation in the next 30 days — worth scheduling, not an emergency. CVSS is ${cvssStr}.`,
    };
  }

  if (cvss !== null && cvss >= 9.0 && (epss === null || epss < 0.05) && !inKev) {
    return {
      priority: "LOW",
      why: `CVSS is ${cvssStr} — terrifying on paper. But it is not on CISA's confirmed-exploited list and EPSS is only ${epssStr}: almost nobody is attacking this. Deprioritise despite the scary number.`,
    };
  }

  return {
    priority: "LOW",
    why: `No confirmed exploitation (not on KEV) and low predicted exploitation probability (EPSS ${epssStr}). CVSS ${cvssStr} alone does not justify urgent action.`,
  };
}
