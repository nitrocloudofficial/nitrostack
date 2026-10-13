/**
 * Loads CISA's Known Exploited Vulnerabilities (KEV) catalog into memory
 * at startup. If a CVE is on this list, it is confirmed to be under
 * active attack in the real world — this is the evidence WARDEN uses to
 * override theoretical CVSS severity. Download failure never crashes the
 * server: we warn and fall back to a tiny seed set so the ranking logic
 * still has something real to show in a network-restricted environment.
 */

const KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

export interface KevEntry {
  cveId: string;
  vendorProject?: string;
  product?: string;
  vulnerabilityName?: string;
  dateAdded?: string;
  requiredAction?: string;
  dueDate?: string;
  ransomwareUse: boolean;
}

// Small, real, illustrative seed — used only if the live feed can't be reached.
const SEED_KEV: KevEntry[] = [
  {
    cveId: "CVE-2021-44228",
    vendorProject: "Apache",
    product: "Log4j2",
    vulnerabilityName: "Apache Log4j2 Remote Code Execution Vulnerability",
    dateAdded: "2021-12-10",
    requiredAction: "Apply updates per vendor instructions.",
    ransomwareUse: true,
  },
  {
    cveId: "CVE-2023-34362",
    vendorProject: "Progress",
    product: "MOVEit Transfer",
    vulnerabilityName: "Progress MOVEit Transfer SQL Injection Vulnerability",
    dateAdded: "2023-06-02",
    requiredAction: "Apply updates per vendor instructions.",
    ransomwareUse: true,
  },
  {
    cveId: "CVE-2017-0144",
    vendorProject: "Microsoft",
    product: "Windows SMB",
    vulnerabilityName: "Microsoft Windows SMB Remote Code Execution Vulnerability (EternalBlue)",
    dateAdded: "2021-11-03",
    requiredAction: "Apply updates per vendor instructions.",
    ransomwareUse: true,
  },
];

class KevIndex {
  private byCve = new Map<string, KevEntry>();
  source: "live" | "seed" | "empty" = "empty";

  get size() {
    return this.byCve.size;
  }

  set(entry: KevEntry) {
    this.byCve.set(entry.cveId.toUpperCase(), entry);
  }

  get(cveId: string): KevEntry | undefined {
    return this.byCve.get(cveId.toUpperCase());
  }

  has(cveId: string): boolean {
    return this.byCve.has(cveId.toUpperCase());
  }
}

export const kevIndex = new KevIndex();

export async function loadKevIndex(): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(KEV_URL, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { vulnerabilities?: unknown[] };
    let count = 0;
    for (const v of data.vulnerabilities ?? []) {
      const o = v as Record<string, unknown>;
      const cveId = String(o.cveID ?? "");
      if (!cveId) continue;
      const notes = String(o.notes ?? "").toLowerCase();
      const knownRansomware = String(o.knownRansomwareCampaignUse ?? "").toLowerCase();
      kevIndex.set({
        cveId,
        vendorProject: o.vendorProject ? String(o.vendorProject) : undefined,
        product: o.product ? String(o.product) : undefined,
        vulnerabilityName: o.vulnerabilityName ? String(o.vulnerabilityName) : undefined,
        dateAdded: o.dateAdded ? String(o.dateAdded) : undefined,
        requiredAction: o.requiredAction ? String(o.requiredAction) : undefined,
        dueDate: o.dueDate ? String(o.dueDate) : undefined,
        ransomwareUse: knownRansomware === "known" || notes.includes("ransomware"),
      });
      count++;
    }
    if (count === 0) throw new Error("feed parsed but yielded zero entries");
    kevIndex.source = "live";
    console.error(`[warden] kev-loader: loaded ${count} confirmed-exploited CVEs from live CISA KEV feed`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[warden] kev-loader: live download failed (${message}); falling back to ${SEED_KEV.length}-entry seed set`);
    for (const entry of SEED_KEV) kevIndex.set(entry);
    kevIndex.source = "seed";
  }
}
