/**
 * Knowledge Graph Agent — Demo Script
 * 
 * Feeds realistic sample Explorer payloads through the full pipeline,
 * then queries the resulting graph to validate everything works.
 */

import dotenv from 'dotenv';
dotenv.config();

import { processExploration, processBatch } from './agents/knowledge/agent';
import { getFullGraph, getAllWorkflows, getForms, getPages, findFeature, keywordSearch } from './agents/knowledge/query';
import { getGraphStats } from './agents/knowledge/graph';
import { eventBus } from './agents/knowledge/publisher';
import { closeDatabase } from './agents/knowledge/database';
import { ExplorerPayload } from './agents/knowledge/models';

// ============================================================================
// SAMPLE PAYLOADS (Simulating Explorer Agent output)
// ============================================================================

const PROJECT_ID = 'demo-saas-app';

const dashboardPayload: ExplorerPayload = {
  project_id: PROJECT_ID,
  page: {
    title: 'Dashboard',
    url: 'https://app.example.com/dashboard',
    route: '/dashboard',
  },
  buttons: [
    { type: 'button', label: 'Create Project', selector: '#btn-create-project', action: 'opens', target: 'Create Project Dialog' },
    { type: 'button', label: 'Refresh', selector: '#btn-refresh', action: 'refresh' },
    { type: 'button', label: 'Export Data', selector: '#btn-export', action: 'download' },
  ],
  links: [
    { type: 'link', label: 'Projects', selector: 'a[href="/projects"]', action: 'navigates', target: '/projects' },
    { type: 'link', label: 'Reports', selector: 'a[href="/reports"]', action: 'navigates', target: '/reports' },
    { type: 'link', label: 'Settings', selector: 'a[href="/settings"]', action: 'navigates', target: '/settings' },
  ],
  dialogs: [
    { name: 'Create Project Dialog', selector: '#modal-create-project', trigger: '#btn-create-project' },
  ],
  sections: [
    { name: 'Recent Activity', selector: '#section-activity' },
    { name: 'Quick Stats', selector: '#section-stats' },
  ],
  features: [
    { name: 'Project Management', description: 'Create, edit, and delete projects', category: 'Core' },
    { name: 'Data Export', description: 'Export project data in CSV/PDF format', category: 'Reporting' },
  ],
};

const projectsPayload: ExplorerPayload = {
  project_id: PROJECT_ID,
  page: {
    title: 'Projects',
    url: 'https://app.example.com/projects',
    route: '/projects',
  },
  buttons: [
    { type: 'button', label: 'Create', selector: '#btn-create', action: 'opens', target: 'Project Form' },
    { type: 'button', label: 'Delete', selector: '#btn-delete', action: 'delete' },
    { type: 'button', label: 'Archive', selector: '#btn-archive', action: 'archive' },
  ],
  forms: [
    {
      name: 'Project Form',
      selector: '#form-project',
      action_url: '/api/projects',
      submit_button: '#btn-submit-project',
      fields: [
        { name: 'Project Name', type: 'text', selector: '#input-name', required: true, placeholder: 'Enter project name' },
        { name: 'Description', type: 'textarea', selector: '#input-description', required: false },
        { name: 'Category', type: 'select', selector: '#select-category', required: true },
        { name: 'Due Date', type: 'date', selector: '#input-due-date', required: false },
      ],
    },
  ],
  features: [
    { name: 'Project CRUD', description: 'Full create, read, update, delete operations for projects', category: 'Core' },
    { name: 'Bulk Actions', description: 'Select and act on multiple projects at once', category: 'Productivity' },
  ],
  workflows: [
    {
      name: 'Create New Project',
      steps: [
        { step_number: 1, action: 'navigate', page_url: '/projects', target_label: 'Projects Page' },
        { step_number: 2, action: 'click', target_selector: '#btn-create', target_label: 'Create Button' },
        { step_number: 3, action: 'type', target_selector: '#input-name', target_label: 'Project Name', value: 'My New Project' },
        { step_number: 4, action: 'select', target_selector: '#select-category', target_label: 'Category', value: 'Engineering' },
        { step_number: 5, action: 'click', target_selector: '#btn-submit-project', target_label: 'Submit Button' },
      ],
    },
  ],
};

const settingsPayload: ExplorerPayload = {
  project_id: PROJECT_ID,
  page: {
    title: 'Settings',
    url: 'https://app.example.com/settings',
    route: '/settings',
  },
  buttons: [
    { type: 'button', label: 'Save Changes', selector: '#btn-save', action: 'submits' },
    { type: 'button', label: 'Reset', selector: '#btn-reset', action: 'reset' },
  ],
  forms: [
    {
      name: 'Profile Settings',
      selector: '#form-profile',
      action_url: '/api/settings/profile',
      fields: [
        { name: 'Display Name', type: 'text', selector: '#input-display-name', required: true },
        { name: 'Email', type: 'email', selector: '#input-email', required: true },
        { name: 'Timezone', type: 'select', selector: '#select-timezone', required: false },
      ],
    },
  ],
  sections: [
    { name: 'Profile', selector: '#section-profile' },
    { name: 'Notifications', selector: '#section-notifications' },
    { name: 'Security', selector: '#section-security' },
  ],
};

// ============================================================================
// DEMO EXECUTION
// ============================================================================

async function runDemo(): Promise<void> {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   KNOWLEDGE GRAPH AGENT — DEMO                     ║');
  console.log('║   Processing 3 sample Explorer payloads             ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  // Listen for events
  eventBus.on('graph.updated', (event) => {
    console.log(`\n  📡 [Event Received] graph.updated — ${event.data.nodes_created} nodes, ${event.data.edges_created} edges`);
  });

  // ── Process all 3 pages ──────────────────────────────────────────────
  console.log('\n\n🔹 PHASE 1: Ingesting Explorer payloads...\n');

  const results = await processBatch([dashboardPayload, projectsPayload, settingsPayload]);

  // ── Query the resulting graph ────────────────────────────────────────
  console.log('\n\n🔹 PHASE 2: Querying the Knowledge Graph...\n');

  // Full graph
  const graph = getFullGraph(PROJECT_ID);
  if (graph) {
    console.log('📊 Graph Statistics:');
    console.log(`   Total nodes: ${graph.stats.total_nodes}`);
    console.log(`   Total edges: ${graph.stats.total_edges}`);
    console.log(`   Total workflows: ${graph.stats.total_workflows}`);
    console.log('   Node types:', JSON.stringify(graph.stats.node_type_counts, null, 2));
    console.log('   Edge types:', JSON.stringify(graph.stats.edge_type_counts, null, 2));
  }

  // Pages
  console.log('\n📄 Pages:');
  const pages = getPages(PROJECT_ID);
  for (const { page, children } of pages) {
    console.log(`   ${page.label} (${page.page_url}) — ${children.length} children`);
    for (const child of children.slice(0, 3)) {
      console.log(`      └─ [${child.node_type}] ${child.label}`);
    }
    if (children.length > 3) {
      console.log(`      └─ ... and ${children.length - 3} more`);
    }
  }

  // Forms
  console.log('\n📝 Forms (for QA Agent):');
  const forms = getForms(PROJECT_ID);
  for (const { form, fields, submit_info } of forms) {
    console.log(`   ${form.label}`);
    console.log(`      Fields: ${fields.map(f => f.label).join(', ')}`);
    console.log(`      Submit URL: ${submit_info.action_url || 'N/A'}`);
  }

  // Workflows
  console.log('\n🔄 Workflows (for Documentation Agent):');
  const workflows = getAllWorkflows(PROJECT_ID);
  for (const wf of workflows) {
    console.log(`   ${wf.name} (${wf.total_steps} steps)`);
    for (const step of wf.steps) {
      console.log(`      ${step.step_number}. ${step.action} → ${step.target_label || step.target_selector}`);
    }
  }

  // Search
  console.log('\n🔍 Search for "project":');
  const searchResults = keywordSearch(PROJECT_ID, 'project');
  for (const result of searchResults.slice(0, 5)) {
    console.log(`   [${result.node.node_type}] ${result.node.label} (score: ${result.score}, matched: ${result.matched_field})`);
  }
  if (searchResults.length > 5) {
    console.log(`   ... and ${searchResults.length - 5} more results`);
  }

  // Feature lookup
  console.log('\n⭐ Find feature "export":');
  const features = findFeature(PROJECT_ID, 'export');
  for (const f of features) {
    console.log(`   [${f.node_type}] ${f.label} — ${f.description}`);
  }

  // ── Summary ──────────────────────────────────────────────────────────
  console.log('\n\n🔹 PHASE 3: Pipeline Summary\n');

  const totalNodes = results.reduce((s, r) => s + r.nodes_created + r.nodes_updated, 0);
  const totalEdges = results.reduce((s, r) => s + r.edges_created, 0);
  const totalWorkflows = results.reduce((s, r) => s + r.workflows_created, 0);
  const totalTime = results.reduce((s, r) => s + r.duration_ms, 0);

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log(`║  Pages processed:    ${results.length.toString().padEnd(33)}║`);
  console.log(`║  Nodes created:      ${totalNodes.toString().padEnd(33)}║`);
  console.log(`║  Edges created:      ${totalEdges.toString().padEnd(33)}║`);
  console.log(`║  Workflows created:  ${totalWorkflows.toString().padEnd(33)}║`);
  console.log(`║  Total time:         ${totalTime + 'ms'.padEnd(31)}║`);
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  ✅ Demo complete — Knowledge Graph is operational  ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Cleanup
  closeDatabase();
}

// Run the demo
runDemo().catch((err) => {
  console.error('Demo failed:', err);
  closeDatabase();
  process.exit(1);
});
