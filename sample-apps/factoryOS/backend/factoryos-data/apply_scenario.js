/**
 * apply_scenario.js
 *
 * Merges a crisis scenario's "patch" object into state.json using dot-path keys
 * (e.g. "machines.M12.temperature_c": 92 sets state.machines.M12.temperature_c = 92).
 *
 * Usage:
 *   node apply_scenario.js bearing_failure     -> applies data/scenarios/bearing_failure.json
 *   node apply_scenario.js reset               -> restores state.json from state.baseline.json
 *
 * Wire this into your Express backend as:
 *   app.post('/api/simulate/:scenarioId', (req, res) => { ... call applyScenario ... })
 * so the "Simulate Crisis" button in the dashboard hits this logic.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = __dirname;
const STATE_PATH = path.join(DATA_DIR, 'state.json');
const BASELINE_PATH = path.join(DATA_DIR, 'state.baseline.json');
const SCENARIOS_DIR = path.join(DATA_DIR, 'scenarios');

function setByPath(obj, dotPath, value) {
  const keys = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] === undefined) cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function saveJSON(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

function ensureBaseline() {
  // On first run, snapshot the untouched state as the baseline so "reset" always works.
  if (!fs.existsSync(BASELINE_PATH)) {
    fs.copyFileSync(STATE_PATH, BASELINE_PATH);
  }
}

function applyScenario(scenarioId) {
  ensureBaseline();

  if (scenarioId === 'reset') {
    const baseline = loadJSON(BASELINE_PATH);
    saveJSON(STATE_PATH, baseline);
    console.log('State reset to baseline (all machines green, no active incident).');
    return baseline;
  }

  const scenarioPath = path.join(SCENARIOS_DIR, `${scenarioId}.json`);
  if (!fs.existsSync(scenarioPath)) {
    throw new Error(`Unknown scenario "${scenarioId}". Check scenarios/index.json for valid ids.`);
  }

  const scenario = loadJSON(scenarioPath);
  const state = loadJSON(STATE_PATH);

  for (const [dotPath, value] of Object.entries(scenario.patch)) {
    setByPath(state, dotPath, value);
  }

  state.meta.last_updated = new Date().toISOString();
  saveJSON(STATE_PATH, state);

  console.log(`Applied scenario "${scenario.label}". Active incident: ${state.meta.active_incident}`);
  console.log('Expected agent flow (for demo narration / agent prompt reference):');
  scenario.expected_agent_flow.forEach((step, i) => {
    console.log(`  ${i + 1}. [${step.agent}] ${step.action} -> ${step.output}`);
  });

  return state;
}

// CLI entry point
if (require.main === module) {
  const scenarioId = process.argv[2];
  if (!scenarioId) {
    console.error('Usage: node apply_scenario.js <scenario_id | reset>');
    console.error('Valid scenario ids: bearing_failure, overheating, inventory_stockout, supplier_delay, safety_breach');
    process.exit(1);
  }
  try {
    applyScenario(scenarioId);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { applyScenario, setByPath };
