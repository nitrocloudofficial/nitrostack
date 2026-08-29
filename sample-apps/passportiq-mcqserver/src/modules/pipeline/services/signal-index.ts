/**
 * The cross-application identifier index.
 *
 * This is the piece that makes PassportIQ more than a document checker: instead
 * of judging an application on its own contents, it inverts the whole seeded pool
 * into `normalised identifier -> which applications carry it`, and any identifier
 * carried by two or more applications becomes a link between them.
 *
 * Built once at construction and reused for every query — detect_duplicate_signals
 * and build_risk_graph both read the SAME index, which is why the signal list and
 * the graph edges can never disagree with each other.
 *
 * Fully deterministic: no LLM, no randomness, no clock. Same seed file always
 * produces the same links, which is the property that makes the demo reveal safe
 * to rehearse.
 */
import {
  EDGE_REASON_LABELS,
  SEVERITY_WEIGHT,
  type SeededApplication,
  type SharedIdentifierKind,
  type SignalSeverity,
} from '../../../contracts/index.js';
import {
  formatAddress,
  normalizeAddress,
  normalizeEmail,
  normalizeImageHash,
  normalizeNameDob,
  normalizePassportNumber,
  normalizePhone,
} from './signal-normalizer.js';

/**
 * Base severity and confidence per identifier kind.
 *
 * Ordering rationale — what a fraud analyst would actually rank highest:
 *   document_image  a byte-identical scan submitted twice is the hardest thing
 *                   to explain away innocently.
 *   passport_number two live applications quoting one passport number is either
 *                   fraud or a data-entry incident; either way it blocks issuance.
 *   name_dob        same person, two applications.
 *   phone/email     shared contact details are common in families, so medium.
 *   address         households genuinely share addresses — weakest on its own,
 *                   which is exactly why it matters in COMBINATION.
 */
const BASE_SIGNAL_STRENGTH: Record<
  SharedIdentifierKind,
  { severity: SignalSeverity; confidence: number }
> = {
  document_image: { severity: 'high', confidence: 0.99 },
  passport_number: { severity: 'high', confidence: 0.98 },
  name_dob: { severity: 'high', confidence: 0.95 },
  phone: { severity: 'medium', confidence: 0.9 },
  email: { severity: 'medium', confidence: 0.88 },
  address: { severity: 'medium', confidence: 0.85 },
};

/**
 * An identifier carried by 3+ applications is escalated to high severity
 * whatever its base level.
 *
 * Two applications sharing a phone number is a family. Three is a pattern —
 * and a pattern is the thing this whole layer exists to surface.
 */
const ESCALATION_THRESHOLD = 3;

/** One normalised identifier value and every application that carries it. */
export interface IdentifierEntry {
  kind: SharedIdentifierKind;
  normalizedValue: string;
  /** applicationIds carrying this value, sorted, de-duplicated. */
  applicationIds: string[];
  /** The value as it appears on each application, for officer-facing evidence. */
  rawByApplication: Record<string, string>;
  /** Only populated for `document_image`: which document(s) carried the hash. */
  documentIdsByApplication: Record<string, string[]>;
}

/**
 * A link between exactly two applications, caused by one shared identifier.
 *
 * `a` and `b` are lexicographically sorted so a pair produces the same link
 * regardless of which side is being queried — that stability is what keeps graph
 * edges and signal IDs idempotent across runs.
 */
export interface SignalLink {
  kind: SharedIdentifierKind;
  normalizedValue: string;
  a: string;
  b: string;
  severity: SignalSeverity;
  confidence: number;
  /** Every application carrying this identifier, not just `a` and `b`. */
  sharedAcrossApplicationIds: string[];
  /** Officer-facing edge label, e.g. "reused phone number". */
  reason: string;
  entry: IdentifierEntry;
}

/** FNV-1a — a tiny stable hash, used only to make signal IDs deterministic. */
function shortHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0').slice(0, 6);
}

export class SignalIndex {
  /** `${kind}::${normalizedValue}` -> entry */
  private readonly entries = new Map<string, IdentifierEntry>();

  /** applicationId -> links touching it */
  private readonly linksByApplication = new Map<string, SignalLink[]>();

  private readonly allLinks: SignalLink[] = [];

  constructor(applications: readonly SeededApplication[]) {
    for (const application of applications) {
      this.indexApplication(application);
    }
    this.buildLinks();
  }

  // -------------------------------------------------------------------------
  // Indexing
  // -------------------------------------------------------------------------

  private add(
    kind: SharedIdentifierKind,
    normalizedValue: string | null,
    applicationId: string,
    rawValue: string,
    documentId?: string
  ): void {
    if (!normalizedValue) return;

    const key = `${kind}::${normalizedValue}`;
    let entry = this.entries.get(key);
    if (!entry) {
      entry = {
        kind,
        normalizedValue,
        applicationIds: [],
        rawByApplication: {},
        documentIdsByApplication: {},
      };
      this.entries.set(key, entry);
    }

    if (!entry.applicationIds.includes(applicationId)) {
      entry.applicationIds.push(applicationId);
    }
    // First raw spelling seen for an application wins — stable and good enough,
    // since all spellings normalise to the same value by definition.
    entry.rawByApplication[applicationId] ??= rawValue;

    if (documentId) {
      const documentIds = (entry.documentIdsByApplication[applicationId] ??= []);
      if (!documentIds.includes(documentId)) documentIds.push(documentId);
    }
  }

  private indexApplication(application: SeededApplication): void {
    const id = application.applicationId;

    if (application.contact?.phone) {
      this.add('phone', normalizePhone(application.contact.phone), id, application.contact.phone);
    }

    if (application.contact?.email) {
      this.add('email', normalizeEmail(application.contact.email), id, application.contact.email);
    }

    this.add('address', normalizeAddress(application.address), id, formatAddress(application.address));

    this.add(
      'passport_number',
      normalizePassportNumber(application.passport.number),
      id,
      application.passport.number
    );

    this.add(
      'name_dob',
      normalizeNameDob(application.fullName, application.dateOfBirth),
      id,
      `${application.fullName.replace(/\s+/g, ' ').trim()} (DOB ${application.dateOfBirth})`
    );

    for (const document of application.documents) {
      this.add(
        'document_image',
        normalizeImageHash(document.imageHash),
        id,
        document.imageHash,
        document.documentId
      );
    }
  }

  // -------------------------------------------------------------------------
  // Link construction
  // -------------------------------------------------------------------------

  private buildLinks(): void {
    for (const entry of this.entries.values()) {
      if (entry.applicationIds.length < 2) continue; // carried by one application: not a signal

      const sharedAcross = [...entry.applicationIds].sort();
      const base = BASE_SIGNAL_STRENGTH[entry.kind];
      const severity: SignalSeverity =
        sharedAcross.length >= ESCALATION_THRESHOLD ? 'high' : base.severity;

      for (let i = 0; i < sharedAcross.length; i += 1) {
        for (let j = i + 1; j < sharedAcross.length; j += 1) {
          const link: SignalLink = {
            kind: entry.kind,
            normalizedValue: entry.normalizedValue,
            a: sharedAcross[i],
            b: sharedAcross[j],
            severity,
            confidence: base.confidence,
            sharedAcrossApplicationIds: sharedAcross,
            reason: EDGE_REASON_LABELS[entry.kind],
            entry,
          };

          this.allLinks.push(link);
          (this.linksByApplication.get(link.a) ?? this.initLinks(link.a)).push(link);
          (this.linksByApplication.get(link.b) ?? this.initLinks(link.b)).push(link);
        }
      }
    }

    // Stable ordering: strongest signals first, then alphabetical. Makes tool
    // output byte-identical across runs, so snapshot-style assertions are safe.
    const bySeverity = (link: SignalLink) => SEVERITY_WEIGHT[link.severity];
    for (const links of this.linksByApplication.values()) {
      links.sort(
        (x, y) =>
          bySeverity(y) - bySeverity(x) ||
          x.kind.localeCompare(y.kind) ||
          x.a.localeCompare(y.a) ||
          x.b.localeCompare(y.b)
      );
    }
    this.allLinks.sort(
      (x, y) =>
        bySeverity(y) - bySeverity(x) ||
        x.kind.localeCompare(y.kind) ||
        x.a.localeCompare(y.a) ||
        x.b.localeCompare(y.b)
    );
  }

  private initLinks(applicationId: string): SignalLink[] {
    const links: SignalLink[] = [];
    this.linksByApplication.set(applicationId, links);
    return links;
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  /** Links that involve `applicationId`, strongest first. */
  getLinksFor(applicationId: string): SignalLink[] {
    return this.linksByApplication.get(applicationId) ?? [];
  }

  getAllLinks(): SignalLink[] {
    return [...this.allLinks];
  }

  /** The other side of a link, given one side. */
  static counterpart(link: SignalLink, applicationId: string): string {
    return link.a === applicationId ? link.b : link.a;
  }

  /**
   * The connected component containing `applicationId` — the "cluster".
   *
   * Transitive on purpose: if A shares a phone with B and B shares an address
   * with C, then C belongs in the picture the officer is shown even though A and
   * C share nothing directly. That indirect hop is the entire point of a graph
   * layer over a per-application check.
   *
   * Returns `[applicationId]` when nothing links to it.
   */
  getCluster(applicationId: string): string[] {
    const visited = new Set<string>([applicationId]);
    const queue: string[] = [applicationId];

    while (queue.length > 0) {
      const current = queue.shift() as string;
      for (const link of this.getLinksFor(current)) {
        const other = SignalIndex.counterpart(link, current);
        if (!visited.has(other)) {
          visited.add(other);
          queue.push(other);
        }
      }
    }

    return [...visited].sort();
  }

  /** Links whose BOTH endpoints are inside `applicationIds`. */
  getLinksWithin(applicationIds: readonly string[]): SignalLink[] {
    const inCluster = new Set(applicationIds);
    const seen = new Set<string>();
    const result: SignalLink[] = [];

    for (const link of this.allLinks) {
      if (!inCluster.has(link.a) || !inCluster.has(link.b)) continue;
      const key = `${link.kind}|${link.normalizedValue}|${link.a}|${link.b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(link);
    }

    return result;
  }

  /** Deterministic, collision-resistant signal ID. Same input, same ID, always. */
  static signalId(link: SignalLink, subjectApplicationId: string): string {
    const other = SignalIndex.counterpart(link, subjectApplicationId);
    return `sig-${link.kind}-${subjectApplicationId}-${other}-${shortHash(link.normalizedValue)}`;
  }
}
