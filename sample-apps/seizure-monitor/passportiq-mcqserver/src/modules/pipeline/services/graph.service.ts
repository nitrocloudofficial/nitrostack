/**
 * GraphService — Backend B's two deterministic cross-application tools.
 *
 *   findReusedSignals()  ->  detect_duplicate_signals
 *   buildGraph()         ->  build_risk_graph
 *
 * No LLM call, no randomness, no network. Both read the same SignalIndex, so a
 * signal reported by one always has a matching edge in the other.
 */
import { Injectable } from '@nitrostack/core';
import {
  ADDRESS_MATCH_SIGNAL_TYPE,
  ADDRESS_MATCH_SUBTYPE,
  EDGE_REASON_LABELS,
  SEVERITY_WEIGHT,
  highestSeverity,
  type BuildRiskGraphToolOutput,
  type DetectDuplicateSignalsToolOutput,
  type DuplicateSignal,
  type DuplicateSignalType,
  type GraphEdgeTool,
  type GraphNodeTool,
  type RiskLevel,
  type SharedIdentifierKind,
} from '../../../contracts/index.js';
import { ApplicationService } from './application.service.js';
import { SignalIndex, type SignalLink } from './signal-index.js';

/** identifier kind -> the contracts.md §2 signal type it is reported as. */
const KIND_TO_SIGNAL_TYPE: Record<SharedIdentifierKind, DuplicateSignalType> = {
  phone: 'phone_match',
  email: 'email_match',
  passport_number: 'passport_number_match',
  name_dob: 'name_dob_match',
  document_image: 'document_similarity',
  // Address has no dedicated member in the frozen enum — see
  // ADDRESS_MATCH_SIGNAL_TYPE in duplicate-signals.contract.ts for the full
  // reasoning and the one-line change that removes this alias.
  address: ADDRESS_MATCH_SIGNAL_TYPE,
};

/**
 * Risk-level thresholds, applied to the summed severity weight of every link
 * touching an application (high=3, medium=2, low=1).
 *
 * Calibrated against the seed data so that: a clean application scores 0 (low);
 * a two-application duplicate pair lands in high (a re-application under a
 * second passport number IS serious); and every member of RING-ALPHA is high.
 */
const RISK_THRESHOLDS = { high: 6, medium: 3 } as const;

function riskLevelFromWeight(weight: number): RiskLevel {
  if (weight >= RISK_THRESHOLDS.high) return 'high';
  if (weight >= RISK_THRESHOLDS.medium) return 'medium';
  return 'low';
}

/** A cluster looks coordinated rather than coincidental when all three hold. */
const COORDINATION_RULE = {
  minClusterSize: 3,
  minDistinctSignalKinds: 2,
  minDensity: 0.5,
} as const;

@Injectable({ deps: [ApplicationService] })
export class GraphService {
  private index: SignalIndex;

  constructor(private readonly applications: ApplicationService) {
    this.index = new SignalIndex(this.applications.getAll());
  }

  /**
   * Rebuild the identifier index from the current pool.
   *
   * The index is a whole-pool inversion, so there is no meaningful "add one
   * application" operation — a new applicant can create links between two
   * *existing* applications that neither carried before (three applications
   * sharing a phone escalates the pair's severity). Rebuilding is O(pool) over a
   * few hundred rows, which is nothing next to the cost of getting it wrong.
   *
   * Called by CaseflowService.openCase() immediately after the insertion, so a
   * freshly filed application is comparable against the pool on the very next
   * detect_duplicate_signals call — no restart, no stale graph.
   */
  reindex(): void {
    this.index = new SignalIndex(this.applications.getAll());
  }

  // =========================================================================
  // detect_duplicate_signals
  // =========================================================================

  /**
   * Check one application's identifiers against every other seeded applicant.
   *
   * Returns the contracts.md §2 shape (`applicationId` + `signals[]`) with the
   * BackendB.docx compatibility fields (`reusedPhone` etc.) derived from those
   * same signals — see duplicate-signals.contract.ts for why both are emitted.
   */
  findReusedSignals(applicationId: string): DetectDuplicateSignalsToolOutput {
    // Throws ApplicationNotFoundError for an unknown ID rather than quietly
    // reporting "no duplicates found", which would look identical to a clean
    // application on the dashboard.
    const subject = this.applications.getApplication(applicationId);
    const links = this.index.getLinksFor(applicationId);

    const signals: DuplicateSignal[] = links.map((link) => {
      const matchedApplicationId = SignalIndex.counterpart(link, applicationId);
      const matched = this.applications.getApplication(matchedApplicationId);

      return {
        signalId: SignalIndex.signalId(link, applicationId),
        type: KIND_TO_SIGNAL_TYPE[link.kind],
        severity: link.severity,
        confidence: link.confidence,
        matchedApplicationId,
        evidence: {
          // Always present, always the true identifier kind — the reliable field
          // to branch on, including for address matches that ride inside
          // manual_review_flag.
          signalSubtype: link.kind === 'address' ? ADDRESS_MATCH_SUBTYPE : link.kind,
          reason: link.reason,
          sharedValue: link.entry.rawByApplication[applicationId] ?? link.normalizedValue,
          matchedValue: link.entry.rawByApplication[matchedApplicationId] ?? link.normalizedValue,
          normalizedValue: link.normalizedValue,
          matchedApplicantName: matched.fullName,
          sharedAcrossApplicationIds: link.sharedAcrossApplicationIds,
          ...(link.kind === 'document_image'
            ? {
                subjectDocumentIds: link.entry.documentIdsByApplication[applicationId] ?? [],
                matchedDocumentIds:
                  link.entry.documentIdsByApplication[matchedApplicationId] ?? [],
              }
            : {}),
        },
      };
    });

    const linkedApplicantIds = [
      ...new Set(signals.map((signal) => signal.matchedApplicationId)),
    ].sort();

    const byKind = (kind: SharedIdentifierKind): string[] =>
      [
        ...new Set(
          links
            .filter((link) => link.kind === kind)
            .map((link) => SignalIndex.counterpart(link, applicationId))
        ),
      ].sort();

    const reusedPhone = byKind('phone');
    const reusedAddress = byKind('address');
    const reusedDocumentImage = byKind('document_image');
    const worst = highestSeverity(signals);

    return {
      // contracts.md §2 — authoritative
      applicationId: subject.applicationId,
      signals,

      // BackendB.docx §3.1 compatibility view — derived from `signals` above.
      // Omitted entirely (rather than sent as []) when empty, matching the
      // build doc's `.optional()` fields.
      ...(reusedPhone.length > 0 ? { reusedPhone } : {}),
      ...(reusedAddress.length > 0 ? { reusedAddress } : {}),
      ...(reusedDocumentImage.length > 0 ? { reusedDocumentImage } : {}),
      linkedApplicantIds,

      summary: {
        signalCount: signals.length,
        highestSeverity: worst,
        linkedApplicationCount: linkedApplicantIds.length,
        headline: this.duplicateHeadline(subject.fullName, links, linkedApplicantIds.length),
      },
    };
  }

  private duplicateHeadline(
    applicantName: string,
    links: readonly SignalLink[],
    linkedCount: number
  ): string {
    if (links.length === 0) {
      return `No reused identifiers found for ${applicantName} across the applicant pool.`;
    }

    const kinds = [...new Set(links.map((link) => EDGE_REASON_LABELS[link.kind]))];
    const plural = linkedCount === 1 ? 'application' : 'applications';
    return `${applicantName} shares ${formatList(kinds)} with ${linkedCount} other ${plural}.`;
  }

  // =========================================================================
  // build_risk_graph
  // =========================================================================

  /**
   * Build the link-analysis graph for the cluster containing `applicationId`.
   *
   * @param includeIdentifierNodes when true, also emits the shared identifiers
   *        themselves as `contact` / `passport` / `document` nodes, so the graph
   *        shows WHICH phone number is shared rather than only that one is.
   *        Default false keeps GraphView's applicant-only view uncluttered.
   */
  buildGraph(applicationId: string, includeIdentifierNodes = false): BuildRiskGraphToolOutput {
    const subject = this.applications.getApplication(applicationId);
    const cluster = this.index.getCluster(applicationId);
    const links = this.index.getLinksWithin(cluster);

    // ---- weight per application, for node risk colouring -------------------
    const weightByApplication = new Map<string, number>();
    for (const id of cluster) weightByApplication.set(id, 0);
    for (const link of links) {
      const weight = SEVERITY_WEIGHT[link.severity];
      weightByApplication.set(link.a, (weightByApplication.get(link.a) ?? 0) + weight);
      weightByApplication.set(link.b, (weightByApplication.get(link.b) ?? 0) + weight);
    }

    // ---- application nodes -------------------------------------------------
    const nodes: GraphNodeTool[] = cluster.map((id) => {
      const application = this.applications.getApplication(id);
      const weight = weightByApplication.get(id) ?? 0;
      const riskLevel = riskLevelFromWeight(weight);

      return {
        // contracts.md §2 fields
        nodeId: id,
        kind: 'application',
        label: `${application.fullName} (${id})`,
        metadata: {
          applicantName: application.fullName,
          applicantId: application.applicantId,
          applicationType: application.applicationType,
          submittedAt: application.submittedAt,
          status: this.applications.getStatus(id),
          signalWeight: weight,
          // seedProfile is deliberately NOT exposed: it records where we planted
          // the overlaps, and a graph that hands the officer the answer key
          // proves nothing about the detection.
        },
        // BackendB.docx §3.2 compatibility fields
        id,
        riskLevel,
        nodeRole: 'applicant',
        isSubject: id === applicationId,
      };
    });

    // ---- application <-> application edges ---------------------------------
    const edges: GraphEdgeTool[] = links.map((link) => ({
      from: link.a,
      to: link.b,
      relationship: 'shares_identifier',
      weight: SEVERITY_WEIGHT[link.severity] / 3,
      metadata: {
        identifierKind: link.kind,
        severity: link.severity,
        confidence: link.confidence,
        normalizedValue: link.normalizedValue,
        sharedAcrossApplicationIds: link.sharedAcrossApplicationIds,
      },
      source: link.a,
      target: link.b,
      reason: link.reason,
    }));

    if (includeIdentifierNodes) {
      this.appendIdentifierNodes(links, nodes, edges);
    }

    // ---- cluster summary ---------------------------------------------------
    const distinctPairs = new Set(links.map((link) => `${link.a}|${link.b}`)).size;
    const possiblePairs = (cluster.length * (cluster.length - 1)) / 2;
    const density = possiblePairs === 0 ? 0 : distinctPairs / possiblePairs;

    const sharedSignalKinds = [...new Set(links.map((link) => link.reason))].sort();
    const linkedApplicationIds = cluster.filter((id) => id !== applicationId);
    const subjectRiskLevel =
      nodes.find((node) => node.isSubject)?.riskLevel ?? 'low';

    const isCoordinatedPattern =
      cluster.length >= COORDINATION_RULE.minClusterSize &&
      sharedSignalKinds.length >= COORDINATION_RULE.minDistinctSignalKinds &&
      density >= COORDINATION_RULE.minDensity;

    return {
      applicationId: subject.applicationId,
      nodes,
      edges,
      clusterSize: cluster.length,
      clusterSummary: {
        subjectApplicationId: subject.applicationId,
        linkedApplicationIds,
        sharedSignalKinds,
        // Rounded to 2dp so the value is stable to compare and pleasant to print.
        density: Math.round(density * 100) / 100,
        isCoordinatedPattern,
        subjectRiskLevel,
        headline: this.graphHeadline(
          subject.fullName,
          cluster.length,
          sharedSignalKinds,
          isCoordinatedPattern
        ),
      },
    };
  }

  /**
   * Add the shared identifiers as their own nodes (the richer bipartite view).
   *
   * Only identifiers that are actually shared appear, so this never adds an
   * isolated node. Identifier node IDs are namespaced (`id:phone:9845012345`) to
   * guarantee they cannot collide with an applicationId.
   */
  private appendIdentifierNodes(
    links: readonly SignalLink[],
    nodes: GraphNodeTool[],
    edges: GraphEdgeTool[]
  ): void {
    const nodeKindFor: Record<SharedIdentifierKind, GraphNodeTool['kind']> = {
      phone: 'contact',
      email: 'contact',
      address: 'external_record',
      passport_number: 'passport',
      document_image: 'document',
      name_dob: 'applicant',
    };

    const seenNodes = new Set<string>();
    const seenEdges = new Set<string>();

    for (const link of links) {
      const nodeId = `id:${link.kind}:${link.normalizedValue}`;
      const severityWeight = SEVERITY_WEIGHT[link.severity];

      if (!seenNodes.has(nodeId)) {
        seenNodes.add(nodeId);
        nodes.push({
          nodeId,
          kind: nodeKindFor[link.kind],
          label: `${EDGE_REASON_LABELS[link.kind]}: ${
            link.entry.rawByApplication[link.a] ?? link.normalizedValue
          }`,
          metadata: {
            identifierKind: link.kind,
            normalizedValue: link.normalizedValue,
            sharedAcrossApplicationIds: link.sharedAcrossApplicationIds,
          },
          id: nodeId,
          riskLevel: riskLevelFromWeight(severityWeight * link.sharedAcrossApplicationIds.length),
          nodeRole: 'identifier',
          isSubject: false,
        });
      }

      // 'submitted' for documents an applicant filed, 'owns' for identifiers
      // they claim — both members of the frozen relationship enum.
      const relationship: GraphEdgeTool['relationship'] =
        link.kind === 'document_image' ? 'submitted' : 'owns';

      for (const applicationId of link.sharedAcrossApplicationIds) {
        const edgeKey = `${applicationId}->${nodeId}`;
        if (seenEdges.has(edgeKey)) continue;
        seenEdges.add(edgeKey);

        edges.push({
          from: applicationId,
          to: nodeId,
          relationship,
          weight: severityWeight / 3,
          metadata: { identifierKind: link.kind, severity: link.severity },
          source: applicationId,
          target: nodeId,
          reason: EDGE_REASON_LABELS[link.kind],
        });
      }
    }
  }

  private graphHeadline(
    applicantName: string,
    clusterSize: number,
    sharedSignalKinds: readonly string[],
    isCoordinatedPattern: boolean
  ): string {
    if (clusterSize <= 1) {
      return `${applicantName}'s application shares no identifiers with any other applicant.`;
    }

    const others = clusterSize - 1;
    const plural = others === 1 ? 'applicant' : 'applicants';
    const verdict = isCoordinatedPattern
      ? ' The overlap pattern is consistent with a coordinated group, not coincidence.'
      : '';

    return (
      `${applicantName} is linked to ${others} other ${plural} by ` +
      `${formatList([...sharedSignalKinds])}.${verdict}`
    );
  }

  // =========================================================================
  // Shared helpers used by other Backend B services
  // =========================================================================

  /** Applications linked to this one. Used by officer_decide's audit snapshot. */
  getLinkedApplicationIds(applicationId: string): string[] {
    if (!this.applications.has(applicationId)) return [];
    return this.index.getCluster(applicationId).filter((id) => id !== applicationId);
  }

  /** Every cluster of 2+ applications in the pool. Powers the seed-integrity test. */
  getAllClusters(): string[][] {
    const assigned = new Set<string>();
    const clusters: string[][] = [];

    for (const application of this.applications.getAll()) {
      if (assigned.has(application.applicationId)) continue;
      const cluster = this.index.getCluster(application.applicationId);
      for (const id of cluster) assigned.add(id);
      // EVERY connected component, singletons included. Filtering to length > 1
      // here would be wrong twice over: it makes it impossible for a caller to
      // count unconnected applicants (they cannot tell "no singletons" from
      // "singletons withheld"), and it silently breaks the partition invariant
      // that the returned clusters cover the whole pool exactly once.
      // list_applicant_clusters applies its own minClusterSize filter.
      clusters.push(cluster);
    }

    return clusters;
  }
}

/** "a, b and c" — used in officer-facing headlines. */
function formatList(items: string[]): string {
  if (items.length === 0) return 'nothing';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
