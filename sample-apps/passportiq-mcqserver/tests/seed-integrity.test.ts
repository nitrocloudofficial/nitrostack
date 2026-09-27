/**
 * Seed-dataset integrity tests.
 *
 * The demo's whole reveal rests on planted overlaps being FOUND. A typo in a phone
 * number or one stray space in a hash silently un-plants a signal, the graph comes
 * back with one node, and there is no way to tell from the output whether the
 * detector is broken or the data is.
 *
 * So these tests assert the two halves against each other:
 *
 *   intent   — `seedProfile.ring` / `seedProfile.notes`, written by hand
 *   reality  — what SignalIndex + GraphService actually detect
 *
 * If they ever disagree, the failure names which applicant drifted.
 *
 * Run: npm run test:seed
 */
import { GraphService } from '../src/modules/pipeline/services/graph.service.js';
import { ApplicationService } from '../src/modules/pipeline/services/application.service.js';
import { loadSeedDataset } from '../src/modules/pipeline/services/seed-data.loader.js';
import {
  normalizeAddress,
  normalizeImageHash,
  normalizePhone,
} from '../src/modules/pipeline/services/signal-normalizer.js';
import { check, equal, report, section } from './harness.js';

// Constructed directly, not through DI: this suite tests the DATA and the
// detection maths, and must not be able to fail because of server wiring.
const applications = new ApplicationService();
const graph = new GraphService(applications);

section('Dataset loads and validates');
{
  const dataset = loadSeedDataset();
  check('seed-applications.json parses against SeedDatasetSchema', dataset.applications.length > 0);
  equal('9 applications seeded', dataset.applications.length, 9);

  const documentCount = dataset.applications.reduce((n, a) => n + a.documents.length, 0);
  check(`documents present (${documentCount})`, documentCount >= 30);

  const ids = dataset.applications.map((a) => a.applicationId);
  equal('application IDs are unique', new Set(ids).size, ids.length);

  const documentIds = dataset.applications.flatMap((a) => a.documents.map((d) => d.documentId));
  equal('document IDs are unique', new Set(documentIds).size, documentIds.length);

  // A hash with a stray space normalizes differently and silently un-plants the
  // photo-reuse signal — the single most fragile field in the dataset.
  const malformed = dataset.applications.flatMap((a) =>
    a.documents.filter((d) => !/^sha256:[0-9a-f]{64}$/.test(d.imageHash)).map((d) => d.documentId)
  );
  equal('every imageHash is well-formed sha256:<64 hex>', malformed, []);
}

section('Normalizers collapse the deliberate formatting variations');
{
  // These exact strings are in the seed file. If normalization regresses, the
  // ring silently stops being detected — so the variations are asserted directly.
  equal('phone +91 98450 12345', normalizePhone('+91 98450 12345'), '9845012345');
  equal('phone +919845012345 (no spaces)', normalizePhone('+919845012345'), '9845012345');
  equal('phone 098450 12345 (leading 0)', normalizePhone('098450 12345'), '9845012345');
  equal('phone 98450 12345 (no country code)', normalizePhone('98450 12345'), '9845012345');

  const a = normalizeAddress({
    line1: 'M.G. Road',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560001',
  });
  const b = normalizeAddress({
    line1: 'mg road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
  });
  check('"M.G. Road, Bangalore" === "mg road, Bengaluru"', a !== null && a === b, `${a} vs ${b}`);

  equal(
    'imageHash normalization trims and lowercases',
    normalizeImageHash('  SHA256:ABC  '),
    'sha256:abc'
  );
}

section('RING-ALPHA (4 applications) is detected as planted');
{
  const SUBJECT = 'PIQ-2026-2001';
  const EXPECTED = ['PIQ-2026-2002', 'PIQ-2026-2003', 'PIQ-2026-2004'];

  const linked = graph.getLinkedApplicationIds(SUBJECT);
  equal(`${SUBJECT} links to exactly the 3 planted applicants`, linked, EXPECTED);

  const result = graph.findReusedSignals(SUBJECT);
  equal('highest severity is high', result.summary.highestSeverity, 'high');

  // 2001's DIRECT signals, per its seedProfile note: reused phone with 2002 and
  // 2003, reused address with 2003 and 2004, reused photograph with 2004.
  // Email and passport-number reuse exist in this ring but NOT on 2001 — they are
  // 2002<->2003 and 2002<->2004. Asserting them here would be asserting a link
  // the dataset deliberately does not plant; they are checked cluster-wide below.
  const kinds = new Set(
    result.signals.map((s) => String((s.evidence as Record<string, unknown>)['signalSubtype']))
  );
  for (const kind of ['phone', 'address_match', 'document_image']) {
    check(`planted '${kind}' overlap is detected on the subject`, kinds.has(kind));
  }
  equal('subject has exactly 5 direct signals', result.signals.length, 5);

  check(
    'email reuse is NOT a direct signal of 2001 (planted on 2002<->2003)',
    !kinds.has('email')
  );
  check(
    'passport reuse is NOT a direct signal of 2001 (planted on 2002<->2004)',
    !kinds.has('passport_number')
  );

  // The photo reuse is the reveal moment — assert the exact pair, not just "a
  // document_image signal exists somewhere".
  const photo = result.signals.find(
    (s) => (s.evidence as Record<string, unknown>)['signalSubtype'] === 'document_image'
  );
  equal('reused photograph pairs 2001 with 2004', photo?.matchedApplicationId, 'PIQ-2026-2004');
  equal('photo signal is high severity', photo?.severity, 'high');
  equal('photo signal maps to document_similarity', photo?.type, 'document_similarity');

  const g = graph.buildGraph(SUBJECT);
  equal('graph cluster size is 4', g.clusterSize, 4);
  equal('graph has 4 applicant nodes', g.nodes.length, 4);
  check('graph has multiple edges', g.edges.length >= 4, `edges=${g.edges.length}`);
  check('cluster is flagged as coordinated', g.clusterSummary.isCoordinatedPattern === true);
  equal('subject risk level is high', g.clusterSummary.subjectRiskLevel, 'high');
  check(
    'every edge carries a human-readable reason',
    g.edges.every((e) => typeof e.reason === 'string' && e.reason.length > 0)
  );
  check(
    'exactly one node is marked as the subject',
    g.nodes.filter((n) => n.isSubject).length === 1
  );

  // Cluster-wide: the email and passport overlaps that 2001 does not carry
  // directly must still surface in the ring's shared-signal summary, because
  // that is what makes the cluster read as coordinated rather than a coincidence.
  const shared = g.clusterSummary.sharedSignalKinds;
  check('cluster reports the reused email address', shared.includes('reused email address'));
  check('cluster reports the reused passport number', shared.includes('reused passport number'));
  check('cluster reports the reused document photo', shared.includes('reused document photo'));

  // Transitive reach: 2002 is linked to 2004 only through shared identifiers with
  // other members, never directly to 2001 by address or photo. If BFS regressed
  // to direct neighbours only, the cluster would silently shrink to 3.
  check(
    'graph includes an edge between two NON-subject applicants',
    g.edges.some((e) => e.from !== SUBJECT && e.to !== SUBJECT),
    'transitive edges missing — BFS may have regressed to direct links only'
  );
}

section('RING-BETA (2 applications) is detected via name+dob');
{
  const g = graph.buildGraph('PIQ-2026-3001');
  equal('cluster size is 2', g.clusterSize, 2);
  equal('links to the paired applicant', graph.getLinkedApplicationIds('PIQ-2026-3001'), [
    'PIQ-2026-3002',
  ]);

  const result = graph.findReusedSignals('PIQ-2026-3001');
  const types = new Set(result.signals.map((s) => s.type));
  check('name_dob_match is detected despite the double space', types.has('name_dob_match'));
  check('phone_match is detected despite the missing country code', types.has('phone_match'));
}

section('Control applicants are genuinely clean');
{
  for (const id of ['PIQ-2026-1001', 'PIQ-2026-1002', 'PIQ-2026-1003']) {
    const result = graph.findReusedSignals(id);
    equal(`${id} has no duplicate signals`, result.signals.length, 0);
    equal(`${id} has no linked applications`, graph.getLinkedApplicationIds(id), []);

    const g = graph.buildGraph(id);
    equal(`${id} graph is a single node`, g.clusterSize, 1);
    check(`${id} is not flagged as coordinated`, g.clusterSummary.isCoordinatedPattern === false);
  }
}

section('Whole-pool clustering partitions the queue exactly');
{
  const clusters = graph.getAllClusters();
  const flat = clusters.flat();

  equal('clusters cover all 9 applications', flat.length, 9);
  equal('no application appears in two clusters', new Set(flat).size, 9);

  const sizes = clusters.map((c) => c.length).sort((a, b) => b - a);
  equal('cluster sizes are [4, 2, 1, 1, 1]', sizes, [4, 2, 1, 1, 1]);
}

section('Detection is deterministic (same input, byte-identical output)');
{
  // A demo reveal that differs between runs is worse than no reveal. Detection is
  // pure over immutable seed data, so repeated calls must serialize identically —
  // this catches accidental Set/Map iteration-order or Date.now() leakage.
  const first = JSON.stringify(graph.findReusedSignals('PIQ-2026-2001'));
  const second = JSON.stringify(graph.findReusedSignals('PIQ-2026-2001'));
  check('detect_duplicate_signals is byte-identical across calls', first === second);

  const g1 = JSON.stringify(graph.buildGraph('PIQ-2026-2001'));
  const g2 = JSON.stringify(graph.buildGraph('PIQ-2026-2001'));
  check('build_risk_graph is byte-identical across calls', g1 === g2);

  // A fresh service instance must agree with the warm one, or something is
  // caching across construction.
  const fresh = new GraphService(new ApplicationService());
  check(
    'a fresh GraphService produces the identical graph',
    JSON.stringify(fresh.buildGraph('PIQ-2026-2001')) === g1
  );
}

section('Planted intent matches detected reality');
{
  // The cross-check that makes the whole suite worth having: seedProfile.ring is
  // hand-written intent; the cluster is computed. They must agree.
  for (const application of applications.getAll()) {
    const ring = application.seedProfile?.ring ?? null;
    const clusterSize = graph.buildGraph(application.applicationId).clusterSize;

    if (ring === null) {
      check(
        `${application.applicationId} declares no ring and is unconnected`,
        clusterSize === 1,
        `clusterSize=${clusterSize}`
      );
    } else {
      check(
        `${application.applicationId} declares ${ring} and is connected`,
        clusterSize > 1,
        `clusterSize=${clusterSize}`
      );
    }
  }

  // Every applicant sharing a ring label must land in the SAME computed cluster.
  const byRing = new Map<string, string[]>();
  for (const application of applications.getAll()) {
    const ring = application.seedProfile?.ring;
    if (!ring) continue;
    byRing.set(ring, [...(byRing.get(ring) ?? []), application.applicationId]);
  }

  for (const [ring, members] of byRing) {
    const computed = graph.buildGraph(members[0]!).clusterSummary;
    const computedMembers = [members[0]!, ...computed.linkedApplicationIds].sort();
    equal(`${ring}: declared members === computed cluster`, computedMembers, [...members].sort());
  }
}

report('Seed integrity');
