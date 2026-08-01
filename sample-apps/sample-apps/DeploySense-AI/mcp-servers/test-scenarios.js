import 'reflect-metadata';
import fs from 'fs';
import path from 'path';
import { ConfigService } from './dist/modules/config/config.service.js';
import { GithubService } from './dist/modules/github/github.service.js';
import { LogsService } from './dist/modules/logs/logs.service.js';
import { MetricsService } from './dist/modules/metrics/metrics.service.js';
import { KubernetesService } from './dist/modules/kubernetes/kubernetes.service.js';
import { JiraService } from './dist/modules/jira/jira.service.js';
import { SlackService } from './dist/modules/slack/slack.service.js';
import { InvestigationService } from './dist/modules/investigation/investigation.service.js';

// Helper to set scenario programmatically
function setScenario(scenario) {
  const simulationDataDir = path.join(process.cwd(), '..', 'simulation-data');
  const activeScenarioPath = path.join(simulationDataDir, 'active-scenario.json');
  fs.writeFileSync(activeScenarioPath, JSON.stringify({ activeScenario: scenario }, null, 2), 'utf8');
}

async function runScenarioTests() {
  console.log('🚀 Instantiating Services for Scenario Tests...');
  const config = new ConfigService();
  const github = new GithubService(config);
  const logs = new LogsService(config);
  const metrics = new MetricsService(config);
  const k8s = new KubernetesService(config);
  const jira = new JiraService(config);
  const slack = new SlackService(config);
  const investigation = new InvestigationService(github, logs, metrics, k8s, jira, slack, config);
  console.log('✅ Services instantiated successfully.\n');

  const scenarios = [
    {
      id: 'scenario1',
      expectedKey: 'Missing Stripe API Key'
    },
    {
      id: 'scenario2',
      expectedKey: 'Database Connection Pool Exhaustion'
    },
    {
      id: 'scenario3',
      expectedKey: 'Session cache Memory Leak'
    }
  ];

  for (const scen of scenarios) {
    console.log(`-----------------------------------------------------------------`);
    console.log(`Setting active scenario to: ${scen.id}`);
    setScenario(scen.id);

    console.log(`Executing investigation...`);
    const result = await investigation.investigateIncident(`TEST-${scen.id.toUpperCase()}`);

    console.log(`\nResults for ${scen.id.toUpperCase()}:`);
    console.log(`Incident ID:   ${result.incidentId}`);
    console.log(`Scenario Name: ${result.scenario.name}`);
    console.log(`Confidence:    ${result.confidence}%`);
    console.log(`Root Cause:    ${result.rootCause}`);
    console.log(`Jira Ticket:   ${result.jiraTicket.ticketId} - ${result.jiraTicket.url}`);
    
    console.log('\nReasoning Timeline Steps:');
    result.reasoningSteps.forEach(step => {
      console.log(`  [${step.status.toUpperCase()}] ${step.text}`);
    });
    
    const containsExpected = result.rootCause.includes(scen.expectedKey);
    if (containsExpected) {
      console.log(`\n🎉 Verification Passed: Root cause matches expectation!`);
    } else {
      console.error(`\n❌ Verification Failed: Root cause does not contain "${scen.expectedKey}"`);
      process.exit(1);
    }
    console.log(`-----------------------------------------------------------------\n`);
  }

  // Restore to scenario1 for default run
  setScenario('scenario1');
  console.log('Restored active scenario to scenario1.');
}

runScenarioTests().catch(console.error);
