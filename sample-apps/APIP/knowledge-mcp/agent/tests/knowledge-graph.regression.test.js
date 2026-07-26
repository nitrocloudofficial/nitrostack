/*
 * End-to-end regression tests for the Knowledge Graph Agent.
 *
 * These tests intentionally exercise the public pipeline and query APIs rather
 * than individual implementation details.  Each test gets an empty, temporary
 * JSON store so it can run repeatedly without changing the demo database.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-graph-regression-'));
const testDatabasePath = path.join(testDirectory, 'knowledge-graph.json');
process.env.DB_PATH = testDatabasePath;

require('ts-node/register/transpile-only');

const { processExploration } = require('../src/agents/knowledge/agent');
const { validatePayload } = require('../src/agents/knowledge/ingest');
const { closeDatabase } = require('../src/agents/knowledge/database');
const {
  getNodesByProject,
  getEdgesByProject,
} = require('../src/agents/knowledge/graph');
const {
  getAllWorkflows,
  getFullGraph,
  getNavigationPath,
  keywordSearch,
} = require('../src/agents/knowledge/query');
const { eventBus } = require('../src/agents/knowledge/publisher');
const { EdgeType, EventType, NodeType, UIElementSubtype } = require('../src/agents/knowledge/models');

function makePayload(projectId, page, additions = {}) {
  return {
    project_id: projectId,
    page: {
      title: page.title,
      url: page.url,
      route: page.route || page.url,
    },
    ...additions,
  };
}

async function ingest(payload) {
  const result = await processExploration(payload);
  assert.deepEqual(result.errors, [], `ingestion failed: ${result.errors.join('; ')}`);
  return result;
}

function graphFor(projectId) {
  const graph = getFullGraph(projectId);
  assert.ok(graph, `expected graph for project ${projectId}`);
  return graph;
}

function findNode(graph, predicate, message) {
  const node = graph.nodes.find(predicate);
  assert.ok(node, message);
  return node;
}

function assertGraphHasNoDanglingEdges(graph) {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  for (const edge of graph.edges) {
    assert.ok(nodeIds.has(edge.source_node_id), `edge ${edge.id} has a missing source node`);
    assert.ok(nodeIds.has(edge.target_node_id), `edge ${edge.id} has a missing target node`);
  }
  assert.equal(
    new Set(graph.edges.map((edge) => edge.edge_key)).size,
    graph.edges.length,
    'each stored edge must have a unique deterministic edge key'
  );
}

function clearTestStore() {
  closeDatabase();
  fs.rmSync(testDatabasePath, { force: true });
  eventBus.clearEventLog();
}

test.beforeEach(clearTestStore);

test.after(() => {
  closeDatabase();
  fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('rejects malformed Explorer payloads before graph storage', async () => {
  const nullPayload = validatePayload(null);
  assert.equal(nullPayload.valid, false);
  assert.match(nullPayload.errors[0], /non-null object/i);

  const missingFields = validatePayload({ project_id: 'validation-project', page: {} });
  assert.equal(missingFields.valid, false);
  assert.ok(missingFields.errors.some((error) => error.includes('page.title')));
  assert.ok(missingFields.errors.some((error) => error.includes('page.url')));

  const result = await processExploration({
    project_id: 'validation-project',
    page: { title: 'Missing URL' },
  });
  assert.equal(result.nodes_created, 0);
  assert.equal(result.edges_created, 0);
  assert.ok(result.errors.some((error) => error.includes('page.url')));
  assert.equal(getFullGraph('validation-project'), null);
});

test('re-ingestion is idempotent and never leaves dangling edges', async () => {
  const projectId = 'idempotency-project';
  // Ingest the destination first so this case also protects already-resolved
  // cross-page navigation edges from being deleted and recreated on a repeat.
  await ingest(makePayload(projectId, { title: 'Project list', url: '/project-list' }));
  const payload = makePayload(projectId, { title: 'Projects', url: '/projects' }, {
    links: [
      { type: 'link', label: 'View project list', selector: '#project-list-link', action: 'navigates', target: '/project-list' },
    ],
    buttons: [
      { type: 'button', label: 'Create project', selector: '#create-project', action: 'opens', target: 'Project Form' },
    ],
    forms: [
      {
        name: 'Project Form',
        selector: '#project-form',
        fields: [{ name: 'Project name', type: 'text', selector: '#project-name', required: true }],
      },
    ],
    features: [{ name: 'Project management', description: 'Create and manage projects' }],
  });

  await ingest(payload);
  const firstGraph = graphFor(projectId);
  assert.ok(firstGraph.nodes.length > 0);
  assert.ok(firstGraph.edges.length > 0);
  assertGraphHasNoDanglingEdges(firstGraph);

  const secondResult = await ingest(payload);
  const secondGraph = graphFor(projectId);

  assert.equal(secondResult.nodes_created, 0, 'the same page must update existing nodes');
  assert.equal(secondResult.edges_created, 0, 'the same page must not create duplicate edges');
  assert.equal(secondGraph.nodes.length, firstGraph.nodes.length);
  assert.equal(secondGraph.edges.length, firstGraph.edges.length);
  assertGraphHasNoDanglingEdges(secondGraph);
});

test('re-ingestion keeps one workflow and one ordered set of workflow steps', async () => {
  const projectId = 'workflow-project';
  const payload = makePayload(projectId, { title: 'Projects', url: '/projects' }, {
    buttons: [{ type: 'button', label: 'Create', selector: '#create-project' }],
    workflows: [
      {
        name: 'Create a project',
        steps: [
          { step_number: 1, action: 'click', target_selector: '#create-project', target_label: 'Create' },
          { step_number: 2, action: 'type', target_selector: '#project-name', target_label: 'Project name', value: 'Demo project' },
        ],
      },
    ],
  });

  await ingest(payload);
  const secondResult = await ingest(payload);
  const workflows = getAllWorkflows(projectId);

  assert.equal(secondResult.workflows_created, 0, 'the same workflow must be updated, not recreated');
  assert.equal(workflows.length, 1, 'a workflow name/page combination must be unique per project');
  assert.equal(workflows[0].name, 'Create a project');
  assert.deepEqual(workflows[0].steps.map((step) => step.step_number), [1, 2]);
  assert.equal(workflows[0].steps.length, 2, 'workflow steps must not duplicate on re-ingestion');
  assert.ok(workflows[0].steps[0].node_id, 'a workflow step should resolve its target graph node');
});

test('resolves navigation when a destination page is ingested later', async () => {
  const projectId = 'navigation-project';
  await ingest(makePayload(projectId, { title: 'Dashboard', url: '/dashboard' }, {
    links: [
      { type: 'link', label: 'Projects', selector: '#projects-link', action: 'navigates', target: '/projects' },
    ],
  }));

  await ingest(makePayload(projectId, { title: 'Projects', url: '/projects' }, {
    buttons: [{ type: 'button', label: 'Create project', selector: '#create-project' }],
  }));

  const graph = graphFor(projectId);
  const dashboard = findNode(
    graph,
    (node) => node.node_type === NodeType.PAGE && node.page_url === '/dashboard',
    'Dashboard page node is missing'
  );
  const projects = findNode(
    graph,
    (node) => node.node_type === NodeType.PAGE && node.page_url === '/projects',
    'Projects page node is missing'
  );
  const projectsLink = findNode(
    graph,
    (node) => node.node_type === NodeType.UI_ELEMENT && node.subtype === UIElementSubtype.LINK && node.selector === '#projects-link',
    'Projects navigation link is missing'
  );
  const navigationEdge = graph.edges.find(
    (edge) => edge.source_node_id === projectsLink.id && edge.edge_type === EdgeType.NAVIGATES_TO
  );

  assert.ok(navigationEdge, 'the navigation link must have a NAVIGATES_TO edge');
  assert.equal(navigationEdge.target_node_id, projects.id, 'the navigation edge must target the real Projects page');
  assert.notEqual(navigationEdge.source_node_id, navigationEdge.target_node_id, 'navigation must not be a self-loop placeholder');

  const navigationPath = getNavigationPath(projectId, dashboard.id, projects.id);
  assert.ok(navigationPath, 'Dashboard should have a navigation path to Projects');
  assert.equal(navigationPath.path.at(-1).id, projects.id);
  assert.ok(navigationPath.edges.some((edge) => edge.edge_type === EdgeType.NAVIGATES_TO));
});

test('connects a form to a real API endpoint node instead of a self-loop', async () => {
  const projectId = 'form-endpoint-project';
  await ingest(makePayload(projectId, { title: 'New project', url: '/projects/new' }, {
    forms: [
      {
        name: 'Project Form',
        selector: '#project-form',
        action_url: '/api/projects',
        submit_button: '#save-project',
        fields: [{ name: 'Name', type: 'text', selector: '#name' }],
      },
    ],
  }));

  const graph = graphFor(projectId);
  const form = findNode(
    graph,
    (node) => node.node_type === NodeType.FORM && node.selector === '#project-form',
    'Project Form node is missing'
  );
  const submissionEdge = graph.edges.find(
    (edge) => edge.source_node_id === form.id && edge.edge_type === EdgeType.SUBMITS
  );

  assert.ok(submissionEdge, 'a form action URL must create a SUBMITS edge');
  assert.notEqual(submissionEdge.source_node_id, submissionEdge.target_node_id, 'form submission must not be a self-loop');
  const endpoint = graph.nodes.find((node) => node.id === submissionEdge.target_node_id);
  assert.ok(endpoint, 'the SUBMITS target must be stored as a node');
  assert.equal(endpoint.node_type, NodeType.API_ENDPOINT);
  assert.match(`${endpoint.label} ${endpoint.description || ''} ${endpoint.metadata || ''}`, /\/api\/projects/);
});

test('a page refresh removes stale entities and their edges without deleting other pages', async () => {
  const projectId = 'page-update-project';

  await ingest(makePayload(projectId, { title: 'Dashboard', url: '/dashboard' }, {
    buttons: [{ type: 'button', label: 'Unrelated dashboard action', selector: '#dashboard-action' }],
  }));

  const initialSettings = makePayload(projectId, { title: 'Settings', url: '/settings' }, {
    buttons: [
      { type: 'button', label: 'Save settings', selector: '#save-settings' },
      { type: 'button', label: 'Delete account', selector: '#delete-account' },
    ],
    features: [{ name: 'Legacy export', description: 'Old export flow' }],
  });
  await ingest(initialSettings);

  const before = graphFor(projectId);
  const staleIds = new Set(
    before.nodes
      .filter((node) => node.selector === '#delete-account' || node.label === 'Legacy export')
      .map((node) => node.id)
  );
  assert.equal(staleIds.size, 2, 'the setup must contain the two stale Settings entities');

  await ingest(makePayload(projectId, { title: 'Settings', url: '/settings' }, {
    buttons: [{ type: 'button', label: 'Save settings', selector: '#save-settings' }],
    features: [{ name: 'Modern export', description: 'Replacement export flow' }],
  }));

  const after = graphFor(projectId);
  const remainingIds = new Set(after.nodes.map((node) => node.id));
  for (const staleId of staleIds) {
    assert.ok(!remainingIds.has(staleId), 'entities missing from the refreshed page must be deleted');
  }
  assert.ok(after.nodes.some((node) => node.label === 'Modern export'));
  assert.ok(after.nodes.some((node) => node.selector === '#dashboard-action'), 'updating Settings must not delete Dashboard data');
  assertGraphHasNoDanglingEdges(after);
});

test('query paths and searches are isolated to the requested project', async () => {
  const alpha = 'isolation-alpha';
  const beta = 'isolation-beta';
  await ingest(makePayload(alpha, { title: 'Alpha page', url: '/alpha' }, {
    buttons: [{ type: 'button', label: 'Alpha action', selector: '#alpha-action' }],
  }));
  await ingest(makePayload(beta, { title: 'Beta page', url: '/beta' }, {
    buttons: [{ type: 'button', label: 'Beta-only action', selector: '#beta-action' }],
  }));

  const betaGraph = graphFor(beta);
  const betaPage = findNode(betaGraph, (node) => node.node_type === NodeType.PAGE, 'Beta page is missing');
  const betaButton = findNode(betaGraph, (node) => node.selector === '#beta-action', 'Beta button is missing');

  assert.equal(
    getNavigationPath(alpha, betaPage.id, betaButton.id),
    null,
    'a caller must not retrieve a path for nodes in another project'
  );
  assert.equal(keywordSearch(alpha, 'Beta-only').length, 0, 'search must not return nodes from another project');
  assert.equal(getNodesByProject(alpha).every((node) => node.project_id === alpha), true);
  assert.equal(getEdgesByProject(alpha).every((edge) => edge.project_id === alpha), true);
});

test('publishes a graph.updated event with the ingestion result', async () => {
  const projectId = 'publisher-project';
  const events = [];
  const listener = (event) => events.push(event);
  eventBus.on(EventType.GRAPH_UPDATED, listener);

  try {
    await ingest(makePayload(projectId, { title: 'Published page', url: '/published' }, {
      buttons: [{ type: 'button', label: 'Publish me', selector: '#publish-me' }],
    }));
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    eventBus.off(EventType.GRAPH_UPDATED, listener);
  }

  assert.equal(events.length, 1, 'a successful ingestion must notify downstream listeners once');
  assert.equal(events[0].project_id, projectId);
  assert.equal(events[0].event_type, EventType.GRAPH_UPDATED);
  assert.ok(events[0].data.nodes_created > 0);
  assert.ok(eventBus.getEventLog().some((event) => event.project_id === projectId));
});
