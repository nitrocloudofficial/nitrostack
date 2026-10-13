import { GithubService } from './dist/modules/github/github.service.js';
import { LogsService } from './dist/modules/logs/logs.service.js';
import { MetricsService } from './dist/modules/metrics/metrics.service.js';
import { KubernetesService } from './dist/modules/kubernetes/kubernetes.service.js';
import { JiraService } from './dist/modules/jira/jira.service.js';
import { SlackService } from './dist/modules/slack/slack.service.js';
import { InvestigationService } from './dist/modules/investigation/investigation.service.js';

async function runTest() {
  console.log("Initializing services...");
  const github = new GithubService();
  const logs = new LogsService();
  const metrics = new MetricsService();
  const k8s = new KubernetesService();
  const jira = new JiraService();
  const slack = new SlackService();
  
  const investigation = new InvestigationService(github, logs, metrics, k8s, jira, slack);
  
  console.log("Running investigation on INC-1024...");
  const result = await investigation.investigateIncident("INC-1024");
  
  console.log("===================================");
  console.log("INVESTIGATION RESULT:");
  console.log(JSON.stringify(result, null, 2));
  console.log("===================================");
}

runTest().catch(console.error);
