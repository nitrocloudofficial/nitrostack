/**
 * Test / Panel / Specialist Knowledge Graph
 *
 * Builds a nodes-and-edges graph from data that already exists elsewhere
 * in the app (the canonical test registry and the panel-to-specialist
 * mapping) so it stays a single source of truth rather than a hand-kept
 * duplicate. Purely structural/explanatory — it links tests to panels to
 * specialists, not to symptoms or conditions.
 */

import { CANONICAL_TESTS } from './canonicalTests.js';
import { SPECIALIST_BY_PANEL } from './tools/route-specialist.js';

export type GraphNodeType = 'test' | 'panel' | 'specialist';

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function buildKnowledgeGraph(): KnowledgeGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seenPanels = new Set<string>();
  const seenSpecialists = new Set<string>();

  for (const [testName, test] of Object.entries(CANONICAL_TESTS)) {
    const testId = `test:${testName}`;
    const panelId = `panel:${test.category}`;

    nodes.push({ id: testId, label: testName, type: 'test' });

    if (!seenPanels.has(panelId)) {
      seenPanels.add(panelId);
      nodes.push({ id: panelId, label: test.category, type: 'panel' });
    }

    edges.push({ source: testId, target: panelId });

    const specialist = SPECIALIST_BY_PANEL[test.category];
    if (specialist) {
      const specialistId = `specialist:${specialist}`;
      if (!seenSpecialists.has(specialistId)) {
        seenSpecialists.add(specialistId);
        nodes.push({ id: specialistId, label: specialist, type: 'specialist' });
      }
      edges.push({ source: panelId, target: specialistId });
    }
  }

  return { nodes, edges };
}
