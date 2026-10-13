import fs from 'fs';
import path from 'path';

const scenario = process.argv[2];

if (!scenario) {
  console.log('Usage: node set-scenario.js [scenario1|scenario2|scenario3|default]');
  process.exit(1);
}

const validScenarios = ['scenario1', 'scenario2', 'scenario3', 'default'];
if (!validScenarios.includes(scenario)) {
  console.error(`Error: Invalid scenario "${scenario}". Valid options are: ${validScenarios.join(', ')}`);
  process.exit(1);
}

const simulationDataDir = path.join(process.cwd(), '..', 'simulation-data');
const activeScenarioPath = path.join(simulationDataDir, 'active-scenario.json');

try {
  if (!fs.existsSync(simulationDataDir)) {
    fs.mkdirSync(simulationDataDir, { recursive: true });
  }

  const content = JSON.stringify({ activeScenario: scenario }, null, 2);
  fs.writeFileSync(activeScenarioPath, content, 'utf8');
  console.log(`✅ Active scenario successfully updated to: ${scenario}`);
} catch (e) {
  console.error('❌ Failed to update active scenario:', e);
  process.exit(1);
}
