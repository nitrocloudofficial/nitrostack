import { Injectable } from '@nitrostack/core';
import { GithubService } from '../github/github.service.js';
import { LogsService } from '../logs/logs.service.js';
import { MetricsService } from '../metrics/metrics.service.js';
import { KubernetesService } from '../kubernetes/kubernetes.service.js';
import { JiraService } from '../jira/jira.service.js';
import { SlackService } from '../slack/slack.service.js';
import { ConfigService } from '../config/config.service.js';

@Injectable({
  deps: [
    GithubService,
    LogsService,
    MetricsService,
    KubernetesService,
    JiraService,
    SlackService,
    ConfigService,
  ]
})
export class InvestigationService {
  constructor(
    private readonly githubService: GithubService,
    private readonly logsService: LogsService,
    private readonly metricsService: MetricsService,
    private readonly kubernetesService: KubernetesService,
    private readonly jiraService: JiraService,
    private readonly slackService: SlackService,
    private readonly configService: ConfigService,
  ) {}

  async investigateIncident(incidentId: string) {
    const activeScenario = this.configService.getActiveScenarioName();
    
    // Determine failed service and target pods/commits
    let serviceName = 'auth-service';
    let podName = 'auth-service-7f8b9c4d-x2y3z';
    
    if (activeScenario === 'scenario1') {
      serviceName = 'payment-service';
      podName = 'payment-service-86d7f9c-x987y';
    } else if (activeScenario === 'scenario2') {
      serviceName = 'user-service';
      podName = 'user-service-75fa6d-x111y';
    }

    const reasoningSteps: Array<{ time: string; text: string; status: 'info' | 'error' | 'success' | 'warning' }> = [];
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Goal Received
    reasoningSteps.push({
      time: timestamp,
      text: `Incident Commander received goal: Investigate incident ${incidentId} on ${serviceName}`,
      status: 'info'
    });

    // 2. Query Metrics MCP
    const metrics = this.metricsService.getErrorRate();
    const cpu = this.metricsService.getCpuUsage();
    reasoningSteps.push({
      time: timestamp,
      text: `Queries Metrics MCP -> Detected CPU usage at ${cpu?.usagePercent}% and error rate at ${metrics?.ratePercent}% (${metrics?.trend})`,
      status: cpu?.usagePercent > 80 || metrics?.ratePercent > 10 ? 'error' : 'info'
    });

    // 3. Query Kubernetes MCP
    const k8sStatus = this.kubernetesService.getPodStatus(podName);
    reasoningSteps.push({
      time: timestamp,
      text: `Queries Kubernetes MCP -> Pod ${podName} is in status: ${k8sStatus?.status || 'Unknown'} (Restarts: ${k8sStatus?.restarts ?? 0})`,
      status: k8sStatus?.status === 'Running' ? 'success' : 'error'
    });

    // 4. Query GitHub MCP
    const commits = this.githubService.getRecentCommits();
    const changedFiles = this.githubService.getChangedFiles();
    const recentCommit = commits && commits.length > 0 ? commits[0] : null;
    reasoningSteps.push({
      time: timestamp,
      text: recentCommit 
        ? `Queries GitHub MCP -> Recent change detected: "${recentCommit.message}" by ${recentCommit.author}` 
        : `Queries GitHub MCP -> No recent changes found in the repository`,
      status: recentCommit ? 'warning' : 'info'
    });

    // 5. Query Logs MCP
    const logs = this.logsService.latestErrors();
    const serviceErrors = logs.filter((l: any) => l.service === serviceName);
    const mainError = serviceErrors.length > 0 ? serviceErrors[0].message : 'No critical service errors';
    reasoningSteps.push({
      time: timestamp,
      text: `Queries Logs MCP -> Found error trace: "${mainError}"`,
      status: serviceErrors.length > 0 ? 'error' : 'info'
    });

    // First reasoning evaluation
    let confidence = 50;
    let rootCause = 'Unknown issues.';
    let recommendations: string[] = [];

    if (activeScenario === 'scenario3') {
      confidence = 98;
      rootCause = 'Session cache Memory Leak. Unbounded caching of sessions without eviction causing OOMKilled state.';
      recommendations = ['Rollback session cache feature commit', 'Implement cache eviction policy'];
      reasoningSteps.push({
        time: timestamp,
        text: `Reasoning Engine: Memory metrics and OOMKilled pod state correlate perfectly. Confidence = ${confidence}%`,
        status: 'success'
      });
    } else {
      // For Scenario 1 and 2, need to check Configuration first
      confidence = activeScenario === 'scenario1' ? 68 : 75;
      reasoningSteps.push({
        time: timestamp,
        text: `Reasoning Engine: Identified potential triggers, but not enough evidence to confirm cause. Confidence = ${confidence}%`,
        status: 'warning'
      });

      // 6. Query Configuration MCP
      reasoningSteps.push({
        time: timestamp,
        text: `Queries Configuration MCP -> Inspecting environment variables and parameters for ${serviceName}`,
        status: 'info'
      });
      const configData = this.configService.getMockData('config');
      
      if (activeScenario === 'scenario1') {
        const isMissing = configData?.missingVariables?.includes('STRIPE_API_KEY');
        if (isMissing) {
          confidence = 96;
          rootCause = 'Missing Stripe API Key. Recent Stripe client integration commit failed due to missing STRIPE_API_KEY environment variable.';
          recommendations = ['Add STRIPE_API_KEY environment variable', 'Rollback payment service integration'];
          reasoningSteps.push({
            time: timestamp,
            text: `Configuration MCP -> Confirmed missing required environment variable: STRIPE_API_KEY. Confidence = ${confidence}%`,
            status: 'success'
          });
        }
      } else if (activeScenario === 'scenario2') {
        const poolSize = configData?.variables?.DB_POOL_MAX;
        if (poolSize && parseInt(poolSize) <= 2) {
          confidence = 95;
          rootCause = 'Database Connection Pool Exhaustion. DB_POOL_MAX set to 2 is insufficient for traffic load, causing hikaricp timeout exceptions.';
          recommendations = ['Increase DB_POOL_MAX configuration to 20+', 'Optimize DB query performance'];
          reasoningSteps.push({
            time: timestamp,
            text: `Configuration MCP -> Confirmed bottleneck: DB_POOL_MAX is configured too low (${poolSize}). Confidence = ${confidence}%`,
            status: 'success'
          });
        }
      }
    }

    // 7. Execute Actions (Jira, Slack, Report)
    const slackAlert = this.slackService.sendIncidentAlert('#incidents', `Investigating ${incidentId}: ${rootCause}`);
    reasoningSteps.push({
      time: timestamp,
      text: `Notified Slack channel #incidents with root cause analysis`,
      status: 'success'
    });

    const jiraTicket = this.jiraService.createIncidentTicket(`Incident ${incidentId}`, rootCause, 'SEV-1');
    reasoningSteps.push({
      time: timestamp,
      text: `Created Jira ticket ${jiraTicket.ticketId} with severity SEV-1`,
      status: 'success'
    });

    reasoningSteps.push({
      time: timestamp,
      text: `Generated post-mortem incident report`,
      status: 'success'
    });

    return {
      incidentId,
      status: 'Investigation Complete',
      scenario: {
        id: activeScenario,
        name: this.configService.getScenarioData(activeScenario)?.metadata?.name || 'Default Scenario',
        description: this.configService.getScenarioData(activeScenario)?.metadata?.description || ''
      },
      confidence,
      evidence: {
        k8sStatus,
        logs: serviceErrors,
        metrics,
        commits,
        config: this.configService.getMockData('config')
      },
      reasoningSteps,
      rootCause,
      recommendations,
      jiraTicket,
      slackAlert
    };
  }
}

