import fs from 'node:fs';
import path from 'node:path';

process.env.NODE_ENV ??= 'development';
process.env.VITALIS_ALLOW_ANONYMOUS_DEMO ??= 'false';

const expectedTools = [
  'triage_assess_symptoms', 'triage_check_red_flags', 'triage_get_care_options',
  'drugs_search', 'drugs_get_label_info', 'drugs_check_interactions', 'drugs_get_adverse_events', 'drugs_get_recalls',
  'diagnostics_lookup_condition', 'diagnostics_interpret_lab_value', 'diagnostics_explain_lab_test', 'diagnostics_symptom_to_codes',
  'research_search_pubmed', 'research_get_article', 'research_search_trials', 'research_get_trial_details', 'research_summarize_evidence',
  'fhir_search_patients', 'fhir_get_patient', 'fhir_get_conditions', 'fhir_get_medications', 'fhir_get_observations', 'fhir_get_encounters', 'fhir_get_patient_summary',
  'care_generate_handoff', 'care_reconcile_medications', 'care_draft_referral', 'care_find_guidelines', 'care_appointment_prep',
  'diagnostics_lookup_icd11', 'fhir_get_allergies', 'fhir_get_immunizations',
];
const expectedResources = [
  'vitalis://safety-policy', 'vitalis://data-sources', 'vitalis://audit/recent',
  'vitalis://metrics', 'health://checks', 'widget://examples',
];
const expectedPrompts = [
  'clinical_handoff_prompt', 'patient_education_prompt', 'research_critique_prompt',
  'discharge_summary_prompt', 'medication_counseling_prompt',
];

function fail(message) {
  console.error(`Release check failed: ${message}`);
  process.exitCode = 1;
}

const manifestPath = path.resolve('src/widgets/widget-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!Array.isArray(manifest.widgets) || manifest.widgets.length !== 6) {
  fail('widget manifest must contain six entries');
}
for (const widget of manifest.widgets ?? []) {
  if (!widget.uri || !widget.route || !Array.isArray(widget.examples) || widget.examples.length < 2) {
    fail(`widget ${widget.name ?? '<unnamed>'} is missing uri, route, or examples`);
  }
}

const sourceFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'out') continue;
    if (entry.isDirectory()) walk(full);
    else if (full.endsWith('.ts')) sourceFiles.push(full);
  }
}
walk('src/modules');
const source = sourceFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const toolCount = (source.match(/@Tool\(/g) ?? []).length;
const gatewayCount = (source.match(/@UseClinicalGateway\(/g) ?? []).length;
if (toolCount !== 32 || gatewayCount !== 32) {
  fail(`expected 32 tools and 32 gateway applications, got ${toolCount}/${gatewayCount}`);
}
if (/calculator/i.test(source)) fail('stale calculator code/comment detected');
if (/vk_live_(clinician|readonly|admin)_demo_key/i.test(fs.readFileSync('.env.example', 'utf8'))) {
  fail('demo-looking credentials found in .env.example');
}

const { McpApplicationFactory } = await import('@nitrostack/core');
const { AppModule } = await import('../dist/app.module.js');
const server = await McpApplicationFactory.create(AppModule);
await Promise.all(server.pendingComponentRegistrations ?? []);

const actualTools = [...server.tools.keys()];
const actualResources = [...server.resources.keys()];
const actualPrompts = [...server.prompts.keys()];
for (const name of expectedTools) if (!actualTools.includes(name)) fail(`missing tool ${name}`);
for (const uri of expectedResources) if (!actualResources.includes(uri)) fail(`missing resource ${uri}`);
for (const name of expectedPrompts) if (!actualPrompts.includes(name)) fail(`missing prompt ${name}`);

if (process.exitCode) process.exit(process.exitCode);
console.log(JSON.stringify({
  status: 'ok',
  tools: actualTools.length,
  resources: actualResources.length,
  prompts: actualPrompts.length,
  widgets: manifest.widgets.length,
  publicEndpointVerified: false,
}, null, 2));
process.exit(0);
