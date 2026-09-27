import { ingestDocument, listDocs } from "./engine.js";
import { Doc } from "./types.js";

// Demo document set — exercises every detector:
//   • numeric cross-version conflict  — password rotation 90 -> 180 days (v1 vs v2)
//   • category disappearance          — full-disk encryption clause removed in v3
//   • cross-version semantic change   — VPN "required" -> "optional" (v2 vs v3)
//   • cross-document contradiction    — Security Policy vs BYOD on encryption
//   • noise                           — an unrelated travel policy that must NOT flag

const REMOTE_V1 = `Remote Access Security Policy (v1) — Section 3: Endpoint Controls

Section 3.1 — Password Rotation. All remote-access accounts must rotate their passwords every 90 days without exception.

Section 3.2 — Disk Encryption. Every device used for remote access must have full-disk encryption enabled at all times before connecting to corporate systems.

Section 3.3 — VPN Requirement. Remote access to corporate systems is only permitted over the company-managed VPN; direct connections are prohibited.

Section 3.4 — Incident Reporting. Any suspected security incident must be reported to the security team within 24 hours of discovery.`;

const REMOTE_V2 = `Remote Access Security Policy (v2) — Section 3: Endpoint Controls

Section 3.1 — Password Rotation. All remote-access accounts must rotate their passwords every 180 days without exception.

Section 3.2 — Disk Encryption. Every device used for remote access must have full-disk encryption enabled at all times before connecting to corporate systems.

Section 3.3 — VPN Requirement. Remote access to corporate systems is only permitted over the company-managed VPN; direct connections are prohibited.

Section 3.4 — Incident Reporting. Any suspected security incident must be reported to the security team within 72 hours of discovery.`;

const REMOTE_V3 = `Remote Access Security Policy (v3) — Section 3: Endpoint Controls

Section 3.1 — Password Rotation. All remote-access accounts must rotate their passwords every 180 days without exception.

Section 3.3 — VPN Usage. Use of the company-managed VPN for remote access is recommended but optional; employees may connect directly when the VPN is unavailable.

Section 3.4 — Incident Reporting. Any suspected security incident must be reported to the security team within 72 hours of discovery.`;

const BYOD = `Bring-Your-Own-Device (BYOD) Policy — Section 2: Personal Device Standards

Section 2.1 — Scope. This policy governs personally-owned laptops, tablets, and phones used to access corporate systems remotely.

Section 2.2 — Encryption. Full-disk encryption is strongly recommended for personal devices but is not required for remote access; employees may self-attest to encryption status without a technical compliance check.`;

const TRAVEL = `Corporate Travel & Expense Policy — Section 1: Booking

Section 1.1 — Approved Vendors. All domestic air travel must be booked through the approved corporate travel portal unless a documented exception has been granted by a manager.

Section 1.2 — Meal Reimbursement. Meal expenses during approved business travel are reimbursable up to $75 per day without itemized receipts.`;

interface DemoDocSpec {
  key: string;
  title: string;
  docType: string;
  version: string;
  accessTier: string;
  content: string;
  previousKey?: string;
}

export const DEMO_DOC_SPECS: DemoDocSpec[] = [
  { key: "remoteV1", title: "Remote Access Security Policy (v1)", docType: "policy", version: "v1", accessTier: "tier-1", content: REMOTE_V1 },
  { key: "remoteV2", title: "Remote Access Security Policy (v2)", docType: "policy", version: "v2", accessTier: "tier-1", content: REMOTE_V2, previousKey: "remoteV1" },
  { key: "remoteV3", title: "Remote Access Security Policy (v3)", docType: "policy", version: "v3", accessTier: "tier-1", content: REMOTE_V3, previousKey: "remoteV2" },
  { key: "byod", title: "BYOD Policy", docType: "byod-policy", version: "v1", accessTier: "tier-1", content: BYOD },
  { key: "noiseTravel", title: "Travel & Expense Policy", docType: "travel-policy", version: "v1", accessTier: "public", content: TRAVEL },
];

/**
 * Ingests the demo set in dependency order, resolving previousKey links to real ids.
 * Idempotent: an already-seeded demo doc (same title/type/version/content) is
 * reused instead of duplicated — repeated seeding otherwise makes every audit
 * quadratically slower and floods it with repeated findings.
 */
export function seedDemoDocuments(): { docs: Doc[]; byKey: Record<string, Doc> } {
  const existing = listDocs();
  const byKey: Record<string, Doc> = {};
  const docs: Doc[] = [];
  for (const spec of DEMO_DOC_SPECS) {
    const found = existing.find(
      (d) => d.title === spec.title && d.docType === spec.docType && d.version === spec.version && d.content === spec.content,
    );
    const doc = found ?? ingestDocument({
      title: spec.title, docType: spec.docType, version: spec.version, accessTier: spec.accessTier,
      content: spec.content, previousDocumentId: spec.previousKey ? byKey[spec.previousKey].id : null,
    });
    byKey[spec.key] = doc;
    docs.push(doc);
  }
  return { docs, byKey };
}
