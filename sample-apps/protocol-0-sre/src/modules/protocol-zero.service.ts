import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nitrostack/core";
import {
  departments,
  incidents,
  agentLogs,
  agentPipeline,
  DepartmentHealth,
  DepartmentId,
  Incident,
  Recommendation,
  AgentLog,
  HealthStatus,
  EnterpriseState,
  initialEnterpriseState,
} from "./protocol-zero.data.js";

const now = () => new Date().toISOString();
const daysFromNow = (d: number) =>
  new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();

import { StateGraph } from "./state-graph.engine.js";
import { AgentState, NotificationLog } from "./protocol-zero.types.js";
@Injectable()
export class ProtocolZeroService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly departments: DepartmentHealth[] = departments;
  private readonly incidents: Incident[] = incidents;
  private readonly agentLogs: AgentLog[] = agentLogs;

  // Simulated enterprise state
  private enterpriseState: EnterpriseState = { ...initialEnterpriseState };
  private notificationLogs: NotificationLog[] = [];

  private kubernetesPods: any[] = [
    {
      podName: "gateway-service-84d7cb-mh22a",
      namespace: "production",
      status: "Running",
      cpuUsage: "120m",
      memoryUsage: "180Mi",
      restarts: 0,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      podName: "auth-service-7cfbc6b-9p8l2",
      namespace: "production",
      status: "Running",
      cpuUsage: "85m",
      memoryUsage: "256Mi",
      restarts: 0,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      podName: "payment-service-5dc89d-4xzwq",
      namespace: "production",
      status: "Running",
      cpuUsage: "95m",
      memoryUsage: "210Mi",
      restarts: 0,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      podName: "database-pod-0",
      namespace: "production",
      status: "Running",
      cpuUsage: "310m",
      memoryUsage: "1024Mi",
      restarts: 0,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      podName: "datadog-agent-88w9q",
      namespace: "monitoring",
      status: "Running",
      cpuUsage: "45m",
      memoryUsage: "128Mi",
      restarts: 0,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ];

  // Per-incident score degradation: incidentId -> { deployScore, cicdScore, infraScore, issueScore, sprintScore }
  private scenarioDegradations: Map<string, {
    deployScore?: number;
    cicdScore?: number;
    infraScore?: number;
    issueScore?: number;
    sprintScore?: number;
  }> = new Map();

  private pollInterval: NodeJS.Timeout | null = null;
  private incidentIdCounter = 1000; // Start clean at INC-1001

  onApplicationBootstrap() {
    // Monitoring is manual by default unless started via tools/UI
    // this.startMonitoring();
  }

  onModuleDestroy() {
    this.stopMonitoring();
  }

  // ---------------------------------------------------------------------------
  // Monitoring & Polling Controls
  // ---------------------------------------------------------------------------
  startMonitoring() {
    this.enterpriseState.isMonitoringActive = true;
    if (!this.pollInterval) {
      // Poll every 30 seconds
      this.pollInterval = setInterval(() => {
        this.pollMetrics().catch((err) => {
          console.error("Error during live polling:", err);
        });
      }, 30000);

      this.logAgentAction(
        "Monitoring Agent",
        "Started continuous polling (30s interval)",
        "Nominal",
      );
    }
  }

  stopMonitoring() {
    this.enterpriseState.isMonitoringActive = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      this.logAgentAction(
        "Monitoring Agent",
        "Stopped continuous polling",
        "Inactive",
      );
    }
  }

  getMonitoringStatus() {
    return {
      isActive: this.enterpriseState.isMonitoringActive,
      lastPollTimestamp: this.enterpriseState.lastPollTimestamp,
      pollCount: this.enterpriseState.pollCount,
      githubRunsCount: this.enterpriseState.github.workflowRuns.length,
      jiraSprintsCount: this.enterpriseState.jira.sprints.length,
      datadogHttpCheckFailures: this.enterpriseState.datadog.httpCheckFailures,
      recentNotifications: this.notificationLogs.slice(0, 10),
    };
  }

  // ---------------------------------------------------------------------------
  // Direct API Fetchers (Live SaaS Polling)
  // ---------------------------------------------------------------------------
  private async fetchGitHubState() {
    const pat = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    if (!pat || !repo) return;

    try {
      const headers = {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "nitrostack-mcp-server",
      };

      // 1. Fetch Workflow Runs
      const runsRes = await fetch(
        `https://api.github.com/repos/${repo}/actions/runs?per_page=5`,
        { headers },
      );
      if (runsRes.ok) {
        const runsData = (await runsRes.json()) as any;
        if (runsData.workflow_runs) {
          this.enterpriseState.github.workflowRuns = runsData.workflow_runs.map(
            (r: any) => ({
              id: String(r.id),
              name: r.name,
              status: r.status,
              conclusion: r.conclusion,
              logs: `Logs: ${r.html_url}`,
              commitSha: r.head_sha.substring(0, 7),
              createdAt: r.created_at,
            }),
          );
        }
      }

      // 2. Fetch Pull Requests
      const prsRes = await fetch(
        `https://api.github.com/repos/${repo}/pulls?state=open`,
        { headers },
      );
      if (prsRes.ok) {
        const prsData = (await prsRes.json()) as any;
        if (Array.isArray(prsData)) {
          this.enterpriseState.github.pullRequests = prsData.map((pr: any) => ({
            id: String(pr.number),
            title: pr.title,
            author: pr.user?.login || "unknown",
            mergeable: pr.mergeable !== false,
            checksStatus: "success",
            reviewsCount: 1,
            createdAt: pr.created_at,
          }));
        }
      }

      // 3. Fetch Deployments
      const deploysRes = await fetch(
        `https://api.github.com/repos/${repo}/deployments?per_page=5`,
        { headers },
      );
      if (deploysRes.ok) {
        const deploysData = (await deploysRes.json()) as any;
        if (Array.isArray(deploysData)) {
          this.enterpriseState.github.deployments = deploysData.map(
            (d: any) => ({
              id: String(d.id),
              env: d.environment,
              status: "success",
              commitSha: d.sha.substring(0, 7),
              createdAt: d.created_at,
            }),
          );
        }
      }

      // 4. Fetch Issues
      const issuesRes = await fetch(
        `https://api.github.com/repos/${repo}/issues?state=open&per_page=10`,
        { headers },
      );
      if (issuesRes.ok) {
        const issuesData = (await issuesRes.json()) as any;
        if (Array.isArray(issuesData)) {
          this.enterpriseState.github.issues = issuesData.map((i: any) => ({
            id: String(i.number),
            title: i.title,
            timestamp: i.created_at,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch live GitHub state:", err);
    }
  }

  private async fetchJiraState() {
    const baseUrl = process.env.JIRA_BASE_URL;
    const email = process.env.JIRA_USER_EMAIL;
    const token = process.env.JIRA_API_TOKEN;
    if (!baseUrl || !email || !token) return;

    try {
      const auth = Buffer.from(`${email}:${token}`).toString("base64");
      const headers = {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      };

      const jql = "sprint in openSprints()";
      const res = await fetch(
        `${baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=50`,
        { headers },
      );
      if (res.ok) {
        const searchData = (await res.json()) as any;
        if (Array.isArray(searchData.issues)) {
          this.enterpriseState.jira.issues = searchData.issues.map(
            (issue: any) => ({
              ticketId: issue.key,
              title: issue.fields.summary,
              status: issue.fields.status?.name || "Todo",
              priority: issue.fields.priority?.name?.toLowerCase() || "medium",
              assignee: issue.fields.assignee?.displayName || "Unassigned",
              completionProgress:
                issue.fields.status?.name === "Done" ? 100 : 50,
            }),
          );

          const sprintField = Object.keys(
            searchData.issues[0]?.fields || {},
          ).find(
            (k) =>
              k.includes("customfield_") &&
              Array.isArray(searchData.issues[0]?.fields[k]),
          );
          if (
            sprintField &&
            searchData.issues[0]?.fields[sprintField]?.length > 0
          ) {
            const sprintData = searchData.issues[0]?.fields[sprintField][0];
            this.enterpriseState.jira.sprints = [
              {
                sprintId: String(sprintData.id),
                name: sprintData.name,
                storyPointsTotal: 80,
                storyPointsRemaining: 30,
                velocity: 8,
                startDate: sprintData.startDate,
                endDate: sprintData.endDate,
              },
            ];
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch live Jira state:", err);
    }
  }

  private async fetchDatadogState() {
    const apiKey = process.env.DATADOG_API_KEY;
    const appKey = process.env.DATADOG_APP_KEY;
    if (!apiKey || !appKey) return;

    try {
      const ddTime = Math.floor(Date.now() / 1000);
      const query = "avg:system.cpu.user{*}";
      const url = `https://api.datadoghq.com/api/v1/query?from=${ddTime - 300}&to=${ddTime}&query=${encodeURIComponent(query)}`;

      const res = await fetch(url, {
        headers: {
          "DD-API-KEY": apiKey,
          "DD-APPLICATION-KEY": appKey,
          Accept: "application/json",
        },
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        const series = data.series?.[0];
        const points = series?.pointlist;
        if (points && points.length > 0) {
          const latestPoint = points[points.length - 1];
          this.enterpriseState.datadog.cpu = Math.round(latestPoint[1]);
          this.enterpriseState.datadog.lastUpdated = new Date().toISOString();
        }
      }
    } catch (err) {
      console.error("Failed to fetch live Datadog state:", err);
    }
  }

  private async publishSlackWebhook(content: string) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: content }),
      });
    } catch (err) {
      console.error("Failed to publish Slack webhook:", err);
    }
  }

  // ---------------------------------------------------------------------------
  // Gemini LLM API Call via direct REST
  // ---------------------------------------------------------------------------
  public async callGemini(
    prompt: string,
    systemInstruction?: string,
  ): Promise<any> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const config: any = {
        responseMimeType: "application/json",
      };
      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config,
      });

      const textOutput = response.text;
      if (!textOutput) throw new Error("Empty response from Gemini");

      let cleanedOutput = textOutput;
      const jsonMatch = textOutput.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        cleanedOutput = jsonMatch[1];
      } else {
        const fallbackMatch = textOutput.match(/\{[\s\S]*\}/);
        if (fallbackMatch) {
          cleanedOutput = fallbackMatch[0];
        }
      }
      
      return JSON.parse(cleanedOutput);
    } catch (err) {
      console.error("Failed to call Gemini API:", err);
      return null; // Fallback to local rule logic
    }
  }

  // ---------------------------------------------------------------------------
  // Incident Polling & Detection Logic
  // ---------------------------------------------------------------------------
  async pollMetrics() {
    if (!this.enterpriseState.isMonitoringActive) return;

    this.enterpriseState.pollCount++;
    this.enterpriseState.lastPollTimestamp = new Date().toISOString();

    // Fetch live SaaS states if keys are present
    await this.fetchGitHubState();
    await this.fetchJiraState();
    await this.fetchDatadogState();

    // Run checkers
    this.checkCICDFailures();
    this.checkMergeFailures();
    this.checkDeploymentFailures();
    this.checkIssueSpikes();
    this.checkInfrastructureMetrics();
    this.checkSprintRisks();
    this.checkFeatureMeetingOverlap();
    this.checkDeadlineNear();
    this.checkEmployeeLeaveRisks();
    this.checkEmployeeLeaveMeetingOverlap();
  }

  // 1. CI/CD Failures
  private async checkCICDFailures() {
    const failedRun = this.enterpriseState.github.workflowRuns.find(
      (r) => r.status === "completed" && r.conclusion === "failure",
    );
    if (failedRun) {
      const incidentTitle = `GitHub Action Workflow Failure: ${failedRun.name}`;
      const trigger = `Workflow run ${failedRun.id} completed with status 'failure' on commit ${failedRun.commitSha}.`;
      await this.triggerIncidentFlow(
        "CI/CD Failure",
        incidentTitle,
        trigger,
        "critical",
        ["GitHub"],
      );
      failedRun.conclusion = null;
    }
  }

  // 2. Merge Failures
  private async checkMergeFailures() {
    const unmergeablePr = this.enterpriseState.github.pullRequests.find(
      (pr) => !pr.mergeable,
    );
    if (unmergeablePr) {
      const incidentTitle = `GitHub Merge Failure: PR #${unmergeablePr.id}`;
      const trigger = `Pull request '${unmergeablePr.title}' by ${unmergeablePr.author} has conflicts or failed status checks.`;
      await this.triggerIncidentFlow(
        "Merge Failure",
        incidentTitle,
        trigger,
        "medium",
        ["GitHub"],
      );
      unmergeablePr.mergeable = true; // Clear trigger
    }
  }

  // 3. Deployment Failures
  private async checkDeploymentFailures() {
    const failedDeploy = this.enterpriseState.github.deployments.find(
      (d) => d.status === "failed",
    );
    if (failedDeploy) {
      const incidentTitle = `Deployment Failure in ${failedDeploy.env}`;
      const trigger = `GitHub Deployment ${failedDeploy.id} failed for env: ${failedDeploy.env} (commit ${failedDeploy.commitSha}).`;

      if (this.enterpriseState.datadog.cpu < 45) {
        this.enterpriseState.datadog.cpu = 96; // Inject CPU spike to simulate correlation
      }

      await this.triggerIncidentFlow(
        "Deployment Failure",
        incidentTitle,
        trigger,
        "critical",
        ["GitHub", "Datadog"],
      );
      failedDeploy.status = "success"; // Clear trigger
    }
  }

  // 4. Issue Spike
  private async checkIssueSpikes() {
    const rate = this.enterpriseState.github.issues.length;
    const baseRate = this.enterpriseState.github.averageIssueRate;
    const ratio = rate / (baseRate || 1);

    if (ratio >= 1.5) {
      let severity: "low" | "medium" | "high" | "critical" = "low";
      if (ratio > 3) severity = "critical";
      else if (ratio >= 2) severity = "high";
      else if (ratio >= 1.5) severity = "medium";

      const incidentTitle = `GitHub Issue Volume Spike (${ratio.toFixed(1)}x)`;
      const trigger = `Active issues rate: ${rate} compared to baseline hourly average: ${baseRate}.`;
      await this.triggerIncidentFlow(
        "Issue Spike",
        incidentTitle,
        trigger,
        severity,
        ["GitHub"],
      );
      this.enterpriseState.github.issues = []; // Reset issues count
    }
  }

  // 5. Infrastructure Monitoring
  private async checkInfrastructureMetrics() {
    const dd = this.enterpriseState.datadog;
    let severity: "low" | "medium" | "high" | "critical" | null = null;
    let trigger = "";

    if (dd.cpu > 95) {
      severity = "critical";
      trigger = `Datadog Alert: CPU utilization at ${dd.cpu}%.`;
    } else if (dd.cpu > 85) {
      severity = "high";
      trigger = `Datadog Alert: CPU utilization at ${dd.cpu}%.`;
    }

    if (dd.memory > 95) {
      severity = "critical";
      trigger += ` Datadog Alert: Memory usage at ${dd.memory}%.`;
    } else if (dd.memory > 90) {
      severity = severity === "critical" ? "critical" : "high";
      trigger += ` Datadog Alert: Memory usage at ${dd.memory}%.`;
    }

    if (dd.httpCheckFailures >= 3) {
      severity = "critical";
      trigger += ` Service Outage: HTTP check failed 3 consecutive times.`;
    }

    if (severity) {
      await this.triggerIncidentFlow(
        "Infrastructure Monitoring",
        "System Resource Degradation",
        trigger.trim(),
        severity,
        ["Datadog"],
      );
      dd.cpu = 45;
      dd.memory = 62;
      dd.httpCheckFailures = 0;
    }
  }

  // 6. Sprint Failure Prediction
  private async checkSprintRisks() {
    for (const sprint of this.enterpriseState.jira.sprints) {
      const daysLeft = Math.max(
        1,
        Math.ceil(
          (new Date(sprint.endDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      const capacity = sprint.velocity * daysLeft;
      if (sprint.storyPointsRemaining > capacity) {
        const incidentTitle = `Sprint Completion Risk: ${sprint.name}`;
        const trigger = `Sprint remaining work (${sprint.storyPointsRemaining} pts) exceeds expected completion capacity (${capacity} pts) with ${daysLeft} days left.`;
        await this.triggerIncidentFlow(
          "Sprint Failure Prediction",
          incidentTitle,
          trigger,
          "high",
          ["Jira"],
        );
        sprint.endDate = daysFromNow(4);
        sprint.storyPointsRemaining = 30;
      }
    }
  }

  // 7. Feature Incomplete Before Scheduled Meeting
  private async checkFeatureMeetingOverlap() {
    const calendar = this.enterpriseState.calendar;
    const nowMs = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (const event of calendar.events) {
      const eventTime = new Date(event.startTime).getTime();
      if (eventTime > nowMs && eventTime - nowMs <= oneDayMs) {
        if (
          event.type === "release" ||
          event.type === "demo" ||
          event.type === "review"
        ) {
          const incompleteIssues = this.enterpriseState.jira.issues.filter(
            (issue) =>
              issue.priority === "high" || issue.priority === "critical",
          );
          const lowProgressIssues = incompleteIssues.filter(
            (i) => i.completionProgress < 80,
          );

          if (lowProgressIssues.length > 0) {
            const incidentTitle = `Incomplete Features for Scheduled ${event.title}`;
            const trigger = `Upcoming ${event.type} meeting '${event.title}' scheduled in 24 hours, but critical feature progress is under 80% (Ticket ${lowProgressIssues[0].ticketId}: ${lowProgressIssues[0].completionProgress}%).`;
            await this.triggerIncidentFlow(
              "Feature Incomplete",
              incidentTitle,
              trigger,
              "high",
              ["Google Calendar", "Jira"],
            );
            event.type = "regular";
          }
        }
      }
    }
  }

  // 8. Deadline Near
  private async checkDeadlineNear() {
    for (const sprint of this.enterpriseState.jira.sprints) {
      const daysLeft = Math.ceil(
        (new Date(sprint.endDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      );
      const progress =
        ((sprint.storyPointsTotal - sprint.storyPointsRemaining) /
          sprint.storyPointsTotal) *
        100;

      let severity: "low" | "medium" | "high" | "critical" | null = null;
      let trigger = "";

      if (daysLeft === 1 && progress < 90) {
        severity = "critical";
        trigger = `Sprint deadline in 1 day; progress is only ${progress.toFixed(0)}% (Goal: >90%).`;
      } else if (daysLeft <= 2 && progress < 70) {
        severity = "high";
        trigger = `Sprint deadline in ${daysLeft} days; progress is only ${progress.toFixed(0)}% (Goal: >70%).`;
      } else if (daysLeft >= 3 && daysLeft <= 7 && progress < 50) {
        severity = "medium";
        trigger = `Sprint deadline in ${daysLeft} days; progress is only ${progress.toFixed(0)}% (Goal: >50%).`;
      }

      if (severity) {
        await this.triggerIncidentFlow(
          "Deadline Near",
          "Sprint Deadline Risk",
          trigger,
          severity,
          ["Jira"],
        );
        sprint.endDate = daysFromNow(4);
        sprint.storyPointsRemaining = 30;
      }
    }
  }

  // 9. Employee Leave
  private async checkEmployeeLeaveRisks() {
    const calendar = this.enterpriseState.calendar;
    const oooEvents = calendar.events.filter((e) => e.type === "ooo");

    for (const event of oooEvents) {
      const employee = event.attendees[0];
      const criticalTask = this.enterpriseState.jira.issues.find(
        (i) =>
          i.assignee === employee &&
          (i.priority === "high" || i.priority === "critical") &&
          i.status !== "Done",
      );

      if (criticalTask) {
        const incidentTitle = `Resource Absence Risk: ${employee}`;
        const trigger = `${employee} has registered Out Of Office, but is currently assignee for critical ticket ${criticalTask.ticketId}: '${criticalTask.title}'.`;
        await this.triggerIncidentFlow(
          "Employee Leave",
          incidentTitle,
          trigger,
          "high",
          ["Google Calendar", "Jira"],
        );
        event.type = "regular";
      }
    }
  }

  // 10. Employee On Leave But Scheduled Meeting Exists
  private async checkEmployeeLeaveMeetingOverlap() {
    const calendar = this.enterpriseState.calendar;
    const oooEvents = calendar.events.filter((e) => e.type === "ooo");
    const standardMeetings = calendar.events.filter((e) => e.type !== "ooo");

    for (const ooo of oooEvents) {
      const employee = ooo.attendees[0];
      const overlapping = standardMeetings.find(
        (meeting) =>
          meeting.attendees.includes(employee) &&
          ((new Date(meeting.startTime) >= new Date(ooo.startTime) &&
            new Date(meeting.startTime) <= new Date(ooo.endTime)) ||
            (new Date(meeting.endTime) >= new Date(ooo.startTime) &&
              new Date(meeting.endTime) <= new Date(ooo.endTime))),
      );

      if (overlapping) {
        const incidentTitle = `Absence Conflict: ${employee} in ${overlapping.title}`;
        const trigger = `${employee} is scheduled for OOO, but has an overlapping meeting '${overlapping.title}'.`;
        await this.triggerIncidentFlow(
          "Employee Leave Conflict",
          incidentTitle,
          trigger,
          "medium",
          ["Google Calendar"],
        );
        ooo.type = "regular";
      }
    }
  }

  // Helper to trigger custom simulated incidents manually or via checkers
  async triggerScenario(type: string) {
    const state = this.enterpriseState;
    const nowStr = now();

    switch (type) {
      case "cicd_failure":
        state.github.workflowRuns.unshift({
          id: `run-${Date.now()}`,
          name: "CI Build & Test",
          status: "completed",
          conclusion: "failure",
          logs: "npm ERR! code ELIFECYCLE\nnpm ERR! errno 1\nnpm ERR! backend-tests: test: `jest` failed.",
          commitSha: "a83d91",
          createdAt: nowStr,
        });
        break;
      case "merge_failure":
        state.github.pullRequests.unshift({
          id: `pr-${Math.floor(Math.random() * 100)}`,
          title: "feat: Replace primary auth router",
          author: "Sarah Jenkins",
          mergeable: false,
          checksStatus: "failure",
          reviewsCount: 1,
          createdAt: nowStr,
        });
        break;
      case "deployment_failure":
        state.github.deployments.unshift({
          id: `dep-${Date.now()}`,
          env: "production",
          status: "failed",
          commitSha: "e92a83",
          createdAt: nowStr,
        });
        state.datadog.cpu = 98;
        break;
      case "issue_spike":
        state.github.issues = [
          {
            id: "is-1",
            title: "Payment checkout hanging on spin",
            timestamp: nowStr,
          },
          { id: "is-2", title: "HTTP 500 on token refresh", timestamp: nowStr },
          {
            id: "is-3",
            title: "Unable to edit profile email",
            timestamp: nowStr,
          },
          {
            id: "is-4",
            title: "Webhook timeouts on stripe webhooks",
            timestamp: nowStr,
          },
          {
            id: "is-5",
            title: "Cart elements rendering off screen",
            timestamp: nowStr,
          },
        ];
        break;
      case "infra_cpu_spike":
        state.datadog.cpu = 99;
        state.datadog.memory = 84;
        break;
      case "sprint_risk":
        const sprint = state.jira.sprints[0];
        sprint.storyPointsRemaining = 75;
        sprint.endDate = daysFromNow(2);
        sprint.velocity = 8;
        break;
      case "feature_incomplete":
        state.calendar.events.unshift({
          id: `evt-${Date.now()}`,
          title: "Q3 Enterprise Demo Review",
          type: "release",
          startTime: daysFromNow(0.2),
          endTime: daysFromNow(0.3),
          attendees: ["Alex Rivera", "Sarah Jenkins"],
        });
        state.jira.issues.unshift({
          ticketId: "PAY-901",
          title: "Multi-signature corporate vaults",
          status: "In Progress",
          priority: "critical",
          assignee: "Alex Rivera",
          completionProgress: 45,
        });
        break;
      case "deadline_near":
        const spr = state.jira.sprints[0];
        spr.endDate = daysFromNow(1);
        spr.storyPointsTotal = 100;
        spr.storyPointsRemaining = 65;
        break;
      case "employee_leave":
        state.calendar.events.unshift({
          id: `evt-${Date.now()}`,
          title: "Alex Rivera OOO (Family Emergency)",
          type: "ooo",
          startTime: daysFromNow(0),
          endTime: daysFromNow(3),
          attendees: ["Alex Rivera"],
        });
        state.jira.issues.unshift({
          ticketId: "PAY-905",
          title: "Refactor Stripe integration",
          status: "In Progress",
          priority: "critical",
          assignee: "Alex Rivera",
          completionProgress: 50,
        });
        break;
      case "ooo_meeting_overlap":
        state.calendar.events.unshift({
          id: `evt-ooo-${Date.now()}`,
          title: "Sarah Jenkins OOO - Doctor Visit",
          type: "ooo",
          startTime: daysFromNow(0.1),
          endTime: daysFromNow(0.2),
          attendees: ["Sarah Jenkins"],
        });
        state.calendar.events.unshift({
          id: `evt-meet-${Date.now()}`,
          title: "API Version Sync Board",
          type: "regular",
          startTime: daysFromNow(0.12),
          endTime: daysFromNow(0.18),
          attendees: ["Sarah Jenkins", "Alex Rivera"],
        });
        break;
      default:
        throw new Error(`Scenario type '${type}' not recognized.`);
    }

    // Mutate kubernetesPods based on triggered scenario for live telemetry in widgets
    if (type === "deployment_failure") {
      const p = this.kubernetesPods.find((pod) => pod.podName === "gateway-service-84d7cb-mh22a");
      if (p) {
        p.status = "CrashLoopBackOff";
        p.restarts = 15;
        p.cpuUsage = "12m";
        p.memoryUsage = "480Mi";
        p.reason = "Back-off restarting failed container";
        p.message = "Liveness probe failed: HTTP GET /healthz failed with statuscode: 500";
        p.failedAt = new Date().toISOString();
      }
    } else if (type === "infra_cpu_spike") {
      const p = this.kubernetesPods.find((pod) => pod.podName === "auth-service-7cfbc6b-9p8l2");
      if (p) {
        p.status = "Running";
        p.cpuUsage = "980m";
        p.memoryUsage = "240Mi";
        p.restarts = 0;
        p.reason = "High CPU Load Threshold Exceeded";
        p.message = "CPU utilization (99.4%) exceeds warning threshold of 85.0%";
        p.failedAt = new Date().toISOString();
      }
    } else if (type === "cicd_failure") {
      const p = this.kubernetesPods.find((pod) => pod.podName === "payment-service-5dc89d-4xzwq");
      if (p) {
        p.status = "Pending";
        p.cpuUsage = "0m";
        p.memoryUsage = "0Mi";
        p.restarts = 0;
        p.reason = "ContainerCreating";
        p.message = "Failed to pull image 'payment-service:latest': ImagePullBackOff";
        p.failedAt = new Date().toISOString();
      }
    }

    this.logAgentAction(
      "Monitoring Agent",
      `Triggered simulated scenario: ${type}`,
      "Nominal",
    );
    switch (type) {
      case "cicd_failure":
        await this.checkCICDFailures();
        break;
      case "merge_failure":
        await this.checkMergeFailures();
        break;
      case "deployment_failure":
        await this.checkDeploymentFailures();
        break;
      case "issue_spike":
        await this.checkIssueSpikes();
        break;
      case "infra_cpu_spike":
        await this.checkInfrastructureMetrics();
        break;
      case "sprint_risk":
        await this.checkSprintRisks();
        break;
      case "feature_incomplete":
        await this.checkFeatureMeetingOverlap();
        break;
      case "deadline_near":
        await this.checkDeadlineNear();
        break;
      case "employee_leave":
        await this.checkEmployeeLeaveRisks();
        break;
      case "ooo_meeting_overlap":
        await this.checkEmployeeLeaveMeetingOverlap();
        break;
    }
    return {
      success: true,
      message: `Scenario ${type} triggered and processed by agents.`,
    };
  }

  public async simulateDisaster(targetNode: string) {
    const node = targetNode.toLowerCase();
    
    this.logAgentAction(
      "Monitoring Agent",
      `Disaster simulation event received for: ${targetNode}`,
      "Catastrophic state injection in progress.",
    );

    if (node.includes("database") || node.includes("auth-db") || node.includes("db-admin") || node.includes("db")) {
      const p = this.kubernetesPods.find((pod) => pod.podName === "database-pod-0");
      if (p) {
        p.status = "Failed";
        p.cpuUsage = "0m";
        p.memoryUsage = "0Mi";
        p.restarts = 5;
        p.reason = "Evicted / HardwareFailure";
        p.message = "Node lost connection to SAN database storage; filesystem read-only failover error.";
        p.failedAt = new Date().toISOString();
      }
      const existing = this.incidents.find((i) => i.status !== "resolved" && i.title === "Database Connection Outage (database-pod-0)");
      if (!existing) {
        await this.triggerIncidentFlow(
          "Infrastructure Monitoring",
          "Database Connection Outage (database-pod-0)",
          "Kubernetes Pod database-pod-0 status is Failed: Node lost connection to SAN database storage.",
          "critical",
          ["Kubernetes", "Database"]
        );
      }
    } else if (node.includes("gateway") || node.includes("auth")) {
      const p = this.kubernetesPods.find((pod) => pod.podName === "auth-service-7cfbc6b-9p8l2");
      if (p) {
        p.status = "Failed";
        p.cpuUsage = "0m";
        p.memoryUsage = "0Mi";
        p.restarts = 8;
        p.reason = "OOMKilled";
        p.message = "Memory limit of 256Mi exceeded. Process terminated with exit code 137.";
        p.failedAt = new Date().toISOString();
      }
      const existing = this.incidents.find((i) => i.status !== "resolved" && i.title === "Authentication Gateway OOMKilled");
      if (!existing) {
        await this.triggerIncidentFlow(
          "Infrastructure Monitoring",
          "Authentication Gateway OOMKilled",
          "Kubernetes Pod auth-service-7cfbc6b-9p8l2 status is Failed: Memory limit of 256Mi exceeded.",
          "critical",
          ["Kubernetes", "Auth"]
        );
      }
    } else if (node.includes("eu-west-1") || node.includes("region") || node.includes("zone")) {
      this.kubernetesPods.forEach(p => {
        if (p.podName === "database-pod-0" || p.podName === "gateway-service-84d7cb-mh22a") {
          p.status = "Failed";
          p.cpuUsage = "0m";
          p.memoryUsage = "0Mi";
          p.restarts = 15;
          p.reason = "RegionDown";
          p.message = "AWS eu-west-1 region experiencing elevated API error rates and network partitioning.";
          p.failedAt = new Date().toISOString();
        }
      });
      const existing = this.incidents.find((i) => i.status !== "resolved" && i.title === "Cloud Region Outage (eu-west-1)");
      if (!existing) {
        await this.triggerIncidentFlow(
          "Infrastructure Monitoring",
          "Cloud Region Outage (eu-west-1)",
          "AWS eu-west-1 region has experienced a complete network partition and API blackout.",
          "critical",
          ["AWS", "Network"]
        );
      }
    } else {
      const p = this.kubernetesPods.find((pod) => pod.podName === "gateway-service-84d7cb-mh22a");
      if (p) {
        p.status = "Failed";
        p.cpuUsage = "0m";
        p.memoryUsage = "0Mi";
        p.restarts = 10;
        p.reason = "CrashLoopBackOff";
        p.message = "Container failed: exit status 1. Liveness check failed consecutively.";
        p.failedAt = new Date().toISOString();
      }
      const existing = this.incidents.find((i) => i.status !== "resolved" && i.title === "API Gateway CrashLoopBackOff");
      if (!existing) {
        await this.triggerIncidentFlow(
          "Infrastructure Monitoring",
          "API Gateway CrashLoopBackOff",
          "Kubernetes Pod gateway-service-84d7cb-mh22a status is Failed: Container failed with exit status 1.",
          "critical",
          ["Kubernetes", "Gateway"]
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Multi-Agent reasoning execution (LangGraph Flow)
  // ---------------------------------------------------------------------------
  private async triggerIncidentFlow(
    category: string,
    title: string,
    trigger: string,
    severity: "low" | "medium" | "high" | "critical",
    systems: string[],
  ) {
    const id = `INC-${++this.incidentIdCounter}`;

    // Record degradation penalty for this incident so getEngineeringHealth reflects real impact
    const degradation: { deployScore?: number; cicdScore?: number; infraScore?: number; issueScore?: number; sprintScore?: number } = {};
    if (category === "CI/CD Failure")       { degradation.cicdScore = 70; }
    if (category === "Merge Failure")       { degradation.cicdScore = 30; }
    if (category === "Deployment Failure")  { degradation.deployScore = 80; degradation.infraScore = 60; }
    if (category === "Issue Spike")         { degradation.issueScore = 60; }
    if (category === "Infrastructure Spike" || category === "Infrastructure Monitoring") { degradation.infraScore = 90; }
    if (category === "Sprint Risk" || category === "Deadline Near") { degradation.sprintScore = 55; }
    if (category === "Feature Incomplete")  { degradation.sprintScore = 40; }
    if (category === "Employee Leave" || category === "OOO Conflict") { degradation.sprintScore = 30; }
    this.scenarioDegradations.set(id, degradation);

    const newIncident: Incident = {
      incidentId: id,
      title,
      category,
      severity,
      status: "detected",
      timestamp: new Date().toISOString(),
      affectedDepartments: this.determineAffectedDepartments(category),
      affectedSystems: systems,
      trigger,
      rootCause: "Under analysis",
      confidenceScore: 0,
      businessImpact: {
        summary: "Awaiting analysis",
        engineeringRisk: "healthy",
        launchDelay: "unlikely",
        customerImpact: "healthy",
        revenueRisk: "healthy",
        projectedHealthScore: 100,
      },
      timeline: [
        {
          timestamp: new Date().toISOString(),
          agent: "Monitoring Agent",
          event: "Anomaly detected",
          detail: trigger,
        },
      ],
      recommendations: [],
    };

    this.incidents.unshift(newIncident);
    this.logAgentAction(
      "Monitoring Agent",
      `Detected incident ${id}: ${title}`,
      trigger,
    );

    // Instantiate and run LangGraph
    const graph = new StateGraph<AgentState>()
      .addNode("Monitoring", async (s) => this.runMonitoringAgentNode(s))
      .addNode("Engineering", async (s) => this.runEngineeringAgentNode(s))
      .addNode("Executive", async (s) => this.runExecutiveAgentNode(s))
      .addNode("ActionAgent", async (s) => this.runActionAgentNode(s))
      .addNode("AwaitingApproval", async (s) =>
        this.runAwaitingApprovalNode(s),
      );

    graph.addEdge("Monitoring", "Engineering");
    graph.addEdge("Engineering", "Executive");

    graph.addConditionalEdges("Executive", (state) => {
      const appReq = state.executiveReport?.approvalRequired ?? false;
      return appReq ? "AwaitingApproval" : "ActionAgent";
    });

    const initialState: AgentState = {
      incident: newIncident,
      logs: [],
    };

    try {
      const finalState = await graph.execute(initialState, "Monitoring");
      const idx = this.incidents.findIndex((i) => i.incidentId === id);
      if (idx !== -1) {
        this.incidents[idx] = finalState.incident;
      }
      this.recomputeDepartmentHealthScores();
    } catch (err) {
      console.error(`LangGraph execution failed for ${id}:`, err);
    }
  }

  public logAgentAction(
    agent: string,
    action: string,
    detail: string,
    durationMs = 150,
    incidentId?: string,
  ) {
    let extractedIncidentId = incidentId;
    if (!extractedIncidentId) {
      const match = (action + " " + detail).match(/INC-\d{4}/);
      if (match) {
        extractedIncidentId = match[0];
      }
    }

    const log: AgentLog & { incidentId?: string } = {
      logId: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      agent,
      timestamp: new Date().toISOString(),
      action,
      durationMs,
      status: "success",
      detail,
      incidentId: extractedIncidentId,
    };
    this.agentLogs.unshift(log);
  }

  private determineAffectedDepartments(category: string): DepartmentId[] {
    switch (category) {
      case "CI/CD Failure":
      case "Merge Failure":
      case "Deployment Failure":
      case "Infrastructure Monitoring":
        return ["engineering", "operations"];
      case "Issue Spike":
        return ["support", "engineering"];
      case "Sprint Failure Prediction":
      case "Feature Incomplete":
      case "Deadline Near":
        return ["engineering", "operations"];
      case "Employee Leave":
      case "Employee Leave Conflict":
        return ["hr", "operations"];
      default:
        return ["engineering"];
    }
  }

  // --- Graph Nodes ---

  private async runMonitoringAgentNode(
    state: AgentState,
  ): Promise<Partial<AgentState>> {
    state.incident.status = "investigating";
    this.logAgentAction(
      "Monitoring Agent",
      `Incident ${state.incident.incidentId} forwarded to Infrastructure Agent`,
      "Transitioning state...",
    );
    return {};
  }

  private async runEngineeringAgentNode(
    state: AgentState,
  ): Promise<Partial<AgentState>> {
    const inc = state.incident;
    const cat = inc.category;
    let rootCause = "Unknown infrastructure anomaly.";
    let confidence = 85;
    let summary = "Analyzing system telemetry and source changes.";

    const geminiKey = process.env.GEMINI_API_KEY;
    let analysis: any = null;
    if (geminiKey) {
      const systemInstruction = `You are the Infrastructure Agent in a Workplace Digital Twin system. Analyze the incident and output a JSON object containing: "rootCause", "confidenceScore" (0-100), "engineeringRisk" ("healthy" | "warning" | "critical"), and "technicalSummary".`;
      const prompt = `Incident Details:
ID: ${inc.incidentId}
Title: ${inc.title}
Category: ${inc.category}
Severity: ${inc.severity}
Trigger: ${inc.trigger}
Affected Systems: ${inc.affectedSystems.join(", ")}

Provide your engineering analysis:`;

      analysis = await this.callGemini(prompt, systemInstruction);
    }

    if (analysis) {
      rootCause = analysis.rootCause || rootCause;
      confidence =
        typeof analysis.confidenceScore === "number"
          ? analysis.confidenceScore
          : confidence;
      summary = analysis.technicalSummary || summary;
    } else {
      // Local fallback rules
      if (cat === "CI/CD Failure") {
        rootCause =
          "Tests failed in backend pipeline. Re-definition of authentication middleware broke existing integration tests.";
        confidence = 94;
        summary =
          "CI/CD tests failed on master branch, blocking build consolidation.";
      } else if (cat === "Merge Failure") {
        rootCause =
          "Merge conflict in main checkout route due to concurrent modifications on PaymentRouter.tsx.";
        confidence = 90;
        summary = "A conflict blocks the automated release merging pipeline.";
      } else if (cat === "Deployment Failure") {
        rootCause =
          "Failed database migration on commit e92a83 (missing fallback values on schema change) caused checkout service crashes.";
        confidence = 96;
        summary = "Rollback necessary due to failing database migrations.";
      } else if (cat === "Issue Spike") {
        rootCause =
          "Stripe webhook failure returned HTTP 500, causing checkout retries and customer transaction failures.";
        confidence = 88;
        summary = "External payment integration degradation.";
      } else if (cat === "Infrastructure Monitoring") {
        if (inc.title.includes("Database")) {
          rootCause = "Database cluster database-pod-0 lost connection to SAN database storage, forcing read-only file system lock.";
          confidence = 98;
          summary = "Critical storage link eviction detected on database-pod-0.";
        } else if (inc.title.includes("Authentication") || inc.title.includes("Auth")) {
          rootCause = "Auth Gateway auth-service pod exceeded its memory limit of 256Mi and was terminated by K8s OOMKiller.";
          confidence = 95;
          summary = "Out-Of-Memory container termination on auth-service.";
        } else if (inc.title.includes("Cloud Region") || inc.title.includes("eu-west-1")) {
          rootCause = "Complete regional routing partition in AWS eu-west-1, causing both ingress gateway and database nodes to become unreachable.";
          confidence = 99;
          summary = "Wide-scale AWS region network partition outage.";
        } else {
          rootCause = "API Gateway router gateway-service container crashed, failing liveness probes consecutively (exit code 1).";
          confidence = 95;
          summary = "Gateway service liveness probe failures.";
        }
      } else if (cat === "Sprint Failure Prediction") {
        rootCause =
          "Sprint capacity bottleneck. Core developer sick leave decreased velocity to 50%.";
        confidence = 85;
        summary = "Velocity calculations show delivery gap.";
      } else if (cat === "Feature Incomplete") {
        rootCause =
          "Sprint target PAY-901 has only 45% completion due to unresolved external bank API requirements.";
        confidence = 92;
        summary = "Release demo risk: feature not ready.";
      } else if (cat === "Deadline Near") {
        rootCause =
          "High count of unresolved critical bugs blocked QA signoff, leaving only 35% sprint completion.";
        confidence = 89;
        summary = "High bug counts dragging sprint completion progress.";
      } else if (cat === "Employee Leave") {
        rootCause =
          "Lead developer Alex Rivera OOO while assigned critical Stripe integration refactoring (PAY-905).";
        confidence = 91;
        summary = "Owner availability gap for critical task.";
      } else if (cat === "Employee Leave Conflict") {
        rootCause =
          "Sarah Jenkins is registered Out Of Office during scheduled API Sync Board Release meeting.";
        confidence = 87;
        summary = "Required attendee OOO conflict.";
      }
    }

    const engHealth = this.calculateEngineeringHealthScore();

    this.logAgentAction(
      "Infrastructure Agent",
      `Diagnosed Root Cause for ${inc.incidentId} (${confidence}% confidence)`,
      rootCause,
    );

    this.logAgentAction(
      "Operations Agent",
      `Analyzed operational timeline and SLA impact for ${inc.incidentId}`,
      "No immediate infrastructure blocks.",
      80,
    );
    this.logAgentAction(
      "Support Agent",
      `Checked customer queue impact for ${inc.incidentId}`,
      "Active tickets nominal.",
      70,
    );

    inc.rootCause = rootCause;
    inc.confidenceScore = confidence;
    inc.status = "analyzed";

    return {
      engineeringReport: {
        rootCause,
        engineeringHealth: engHealth,
        riskScore:
          inc.severity === "critical" ? 95 : inc.severity === "high" ? 75 : 45,
        confidence,
        summary,
        affectedSystems: inc.affectedSystems,
      },
    };
  }

  private async runExecutiveAgentNode(
    state: AgentState,
  ): Promise<Partial<AgentState>> {
    const inc = state.incident;
    const report = state.engineeringReport;
    const cat = inc.category;

    let businessImpact = "Nominal operational risk.";
    let priority: "high" | "medium" | "low" = "low";
    let launchDelay: "unlikely" | "possible" | "likely" = "unlikely";
    let customerImpact: HealthStatus = "healthy";
    let revenueRisk: HealthStatus = "healthy";
    let recommendations: Recommendation[] = [];
    let approvalRequired = false;

    const geminiKey = process.env.GEMINI_API_KEY;
    let analysis: any = null;
    if (geminiKey) {
      const systemInstruction = `You are the Incident Commander Agent in a Workplace Digital Twin system. Review the engineering report and generate a business impact report. Output a JSON object containing: "businessImpact" (string), "priority" ("high" | "medium" | "low"), "launchDelay" ("unlikely" | "possible" | "likely"), "customerImpact" ("healthy" | "warning" | "critical"), "revenueRisk" ("healthy" | "warning" | "critical"), and "recommendations" (array of objects with "title", "description", "priority" ("high"|"medium"|"low"), "mcpServer" ("GitHub"|"Jira"|"Datadog"|"Slack"|"Google Calendar")).`;
      const prompt = `Incident Details:
ID: ${inc.incidentId}
Title: ${inc.title}
Category: ${inc.category}

Engineering Root Cause Report:
${report?.rootCause}
Confidence: ${report?.confidence}%
Engineering Risk: ${report?.riskScore}

Provide your executive report:`;

      analysis = await this.callGemini(prompt, systemInstruction);
    }

    if (
      analysis &&
      Array.isArray(analysis.recommendations) &&
      analysis.recommendations.length > 0
    ) {
      businessImpact = analysis.businessImpact || businessImpact;
      priority = analysis.priority || priority;
      launchDelay = analysis.launchDelay || launchDelay;
      customerImpact = analysis.customerImpact || customerImpact;
      revenueRisk = analysis.revenueRisk || revenueRisk;

      if (Array.isArray(analysis.recommendations)) {
        recommendations = analysis.recommendations.map(
          (r: any, idx: number) => ({
            recommendationId: `REC-${Date.now()}-${idx}`,
            incidentId: inc.incidentId,
            priority: r.priority || "medium",
            title: r.title || "Action",
            description: r.description || "",
            mcpServer: r.mcpServer || "Jira",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          }),
        );

        approvalRequired = recommendations.some((r) =>
          [
            "Cancel Meeting",
            "Reschedule Meeting",
            "Replacement",
            "Rollback",
            "Escalation",
            "postpone",
          ].some(
            (keyword) =>
              r.title.toLowerCase().includes(keyword.toLowerCase()) ||
              r.description.toLowerCase().includes(keyword.toLowerCase()),
          ),
        );
      }
    } else {
      // Local fallback rules
      if (cat === "CI/CD Failure") {
        businessImpact =
          "Blocker on the current release cycle. High priority as it stops critical bugfixes from deploying.";
        priority = "high";
        launchDelay = "possible";
        customerImpact = "warning";
        approvalRequired = true;
        recommendations = [
          {
            recommendationId: `REC-${Date.now()}-1`,
            incidentId: inc.incidentId,
            priority: "high",
            title: "Revert broken commit",
            description:
              "Revert the broken auth middleware commit (a83d91) on master branch to fix the build pipeline.",
            mcpServer: "GitHub",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
        ];
      } else if (cat === "Merge Failure") {
        businessImpact =
          "Delays PR merge cycle. Stalls developers from pushing updates.";
        priority = "medium";
        recommendations = [
          {
            recommendationId: `REC-${Date.now()}-1`,
            incidentId: inc.incidentId,
            priority: "medium",
            title: "Assign developer to resolve conflict",
            description:
              "Assign Sarah Jenkins in Jira to merge master branch and resolve PaymentRouter conflicts.",
            mcpServer: "Jira",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
        ];
      } else if (cat === "Deployment Failure") {
        businessImpact =
          "Production payments degraded. Real-time transactions failing. Immediate recovery required.";
        priority = "high";
        launchDelay = "likely";
        customerImpact = "critical";
        revenueRisk = "critical";
        approvalRequired = true;
        recommendations = [
          {
            recommendationId: `REC-${Date.now()}-1`,
            incidentId: inc.incidentId,
            priority: "high",
            title: "Rollback Recommendation",
            description:
              "Rollback production deployment to last known stable commit (b45c21).",
            mcpServer: "GitHub",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
          {
            recommendationId: `REC-${Date.now()}-2`,
            incidentId: inc.incidentId,
            priority: "high",
            title: "Notify leadership of launch risk",
            description:
              "Send warning email to Marcus Chen (PM) about checkout page downtime.",
            mcpServer: "Gmail",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
        ];
      } else if (cat === "Issue Spike") {
        businessImpact =
          "Payments are failing. Checkout rates dropped by 40%. Customer complaints rising.";
        priority = "high";
        customerImpact = "critical";
        revenueRisk = "warning";
        approvalRequired = true;
        recommendations = [
          {
            recommendationId: `REC-${Date.now()}-1`,
            incidentId: inc.incidentId,
            priority: "high",
            title: "Escalation Recommendation",
            description:
              "Escalate ticket to Stripe Support API desk and notify dev team via Slack.",
            mcpServer: "Slack",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
        ];
      } else if (cat === "Infrastructure Monitoring") {
        if (inc.title.includes("Database")) {
          businessImpact = "Central Database offline. High transactional risk. Customer checkouts disabled.";
          priority = "high";
          customerImpact = "critical";
          revenueRisk = "critical";
          approvalRequired = true;
          recommendations = [
            {
              recommendationId: `REC-${Date.now()}-1`,
              incidentId: inc.incidentId,
              priority: "high",
              title: "Failover Database to Replica",
              description: "Promote replica database node database-pod-1 to primary storage engine to recover connection.",
              mcpServer: "Datadog",
              status: "pending",
              confidence: report?.confidence || 95,
              evidence: report?.rootCause || inc.trigger,
              businessImpact,
            }
          ];
        } else if (inc.title.includes("Authentication") || inc.title.includes("Auth")) {
          businessImpact = "Authentication service OOMKilled. Users unable to log in or refresh security tokens.";
          priority = "high";
          customerImpact = "critical";
          approvalRequired = true;
          recommendations = [
            {
              recommendationId: `REC-${Date.now()}-1`,
              incidentId: inc.incidentId,
              priority: "high",
              title: "Restart Auth Pod with Higher Memory Limits",
              description: "Re-provision auth-service pod with memory limits raised from 256Mi to 512Mi to prevent OOM cycles.",
              mcpServer: "Datadog",
              status: "pending",
              confidence: report?.confidence || 95,
              evidence: report?.rootCause || inc.trigger,
              businessImpact,
            }
          ];
        } else if (inc.title.includes("Cloud Region") || inc.title.includes("eu-west-1")) {
          businessImpact = "AWS eu-west-1 region failure. API Gateway and Database offline simultaneously.";
          priority = "high";
          customerImpact = "critical";
          revenueRisk = "critical";
          approvalRequired = true;
          recommendations = [
            {
              recommendationId: `REC-${Date.now()}-1`,
              incidentId: inc.incidentId,
              priority: "high",
              title: "Reroute global traffic to secondary region us-east-1",
              description: "Modify Route53 DNS configurations to redirect all live traffic from failing eu-west-1 region to us-east-1.",
              mcpServer: "GitHub",
              status: "pending",
              confidence: report?.confidence || 95,
              evidence: report?.rootCause || inc.trigger,
              businessImpact,
            }
          ];
        } else {
          businessImpact = "API Gateway router crashed. All microservices unreachable from external public domains.";
          priority = "high";
          customerImpact = "critical";
          approvalRequired = true;
          recommendations = [
            {
              recommendationId: `REC-${Date.now()}-1`,
              incidentId: inc.incidentId,
              priority: "high",
              title: "Redeploy API Gateway router replicas",
              description: "Scale API Gateway deployment from 1 replica to 3, triggering a rolling restart to resolve probe failures.",
              mcpServer: "Datadog",
              status: "pending",
              confidence: report?.confidence || 95,
              evidence: report?.rootCause || inc.trigger,
              businessImpact,
            }
          ];
        }
      } else if (cat === "Sprint Failure Prediction") {
        businessImpact =
          "Feature release deadline at risk. Velocity drops threaten the sprint scope.";
        priority = "medium";
        recommendations = [
          {
            recommendationId: `REC-${Date.now()}-1`,
            incidentId: inc.incidentId,
            priority: "medium",
            title: "Review Sprint capacity",
            description:
              "Rescope 10 story points of low-priority items out of the current sprint.",
            mcpServer: "Jira",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
        ];
      } else if (cat === "Feature Incomplete") {
        businessImpact =
          "Release meeting will fail to demo core multi-sig features if kept tomorrow.";
        priority = "high";
        approvalRequired = true;
        recommendations = [
          {
            recommendationId: `REC-${Date.now()}-1`,
            incidentId: inc.incidentId,
            priority: "high",
            title: "Reschedule Meeting",
            description:
              "Reschedule Q3 Enterprise Demo Review calendar event to 3 days later.",
            mcpServer: "Google Calendar",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
        ];
      } else if (cat === "Deadline Near") {
        businessImpact =
          "Sprint deliverables will miss deadline. Core checkout revamp delayed.";
        priority = "high";
        approvalRequired = true;
        recommendations = [
          {
            recommendationId: `REC-${Date.now()}-1`,
            incidentId: inc.incidentId,
            priority: "high",
            title: "Escalation Recommendation",
            description:
              "Escalate to VP of Product and assign secondary developer to clear blockers.",
            mcpServer: "Slack",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
        ];
      } else if (cat === "Employee Leave") {
        businessImpact =
          "Stripe integration refactoring blocked. Risk of missing sprint commitment.";
        priority = "high";
        approvalRequired = true;
        recommendations = [
          {
            recommendationId: `REC-${Date.now()}-1`,
            incidentId: inc.incidentId,
            priority: "high",
            title: "Notify about Replacement",
            description:
              "Reassign Stripe refactoring (PAY-905) to Sarah Jenkins in Jira and notify her in Slack.",
            mcpServer: "Jira",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
        ];
      } else if (cat === "Employee Leave Conflict") {
        businessImpact =
          "Sarah Jenkins is registered OOO but scheduled for critical API Board Sync.";
        priority = "medium";
        approvalRequired = true;
        recommendations = [
          {
            recommendationId: `REC-${Date.now()}-1`,
            incidentId: inc.incidentId,
            priority: "medium",
            title: "Reschedule Meeting",
            description:
              "Reschedule API Version Sync Board meeting by moving it 2 days forward.",
            mcpServer: "Google Calendar",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
        ];
      }
    }

    const projectedHealthScore = Math.max(
      50,
      (report?.engineeringHealth ?? 98) - (priority === "high" ? 15 : 5),
    );

    inc.businessImpact = {
      summary: businessImpact,
      engineeringRisk:
        priority === "high"
          ? "critical"
          : priority === "medium"
            ? "warning"
            : "healthy",
      launchDelay,
      customerImpact,
      revenueRisk,
      projectedHealthScore,
    };

    inc.recommendations = recommendations;
    if (recommendations.length > 0) {
      approvalRequired = true;
    }

    const companyHealth = Math.round(
      this.calculateEngineeringHealthScore() * 0.4 +
        95 * 0.2 +
        96 * 0.15 +
        100 * 0.1 +
        98 * 0.1 +
        100 * 0.05,
    );

    this.logAgentAction(
      "Incident Commander Agent",
      `Calculated Business Impact for ${inc.incidentId} (Projected company health: ${projectedHealthScore}%)`,
      businessImpact,
    );

    return {
      incident: inc,
      executiveReport: {
        businessImpact,
        recommendations,
        priority,
        companyHealth,
        approvalRequired,
      },
    };
  }

  private async runAwaitingApprovalNode(
    state: AgentState,
  ): Promise<Partial<AgentState>> {
    state.incident.status = "pending_approval";

    this.logAgentAction(
      "Incident Commander Agent",
      `Approval required for high-impact actions on ${state.incident.incidentId}`,
      "Pausing execution pipeline...",
    );

    // Generate notifications
    await this.sendSimulatedSlackNotification(state.incident);
    this.sendSimulatedGmailNotification(state.incident);

    return {};
  }

  private async runActionAgentNode(
    state: AgentState,
  ): Promise<Partial<AgentState>> {
    state.incident.status = "mitigating";
    this.logAgentAction(
      "Action Agent",
      `Executing auto-approved recommendations for ${state.incident.incidentId}`,
      "Executing MCP integrations...",
    );

    for (const rec of state.incident.recommendations) {
      rec.status = "executed";
      this.logAgentAction(
        "Action Agent",
        `Executed "${rec.title}" via ${rec.mcpServer}`,
        rec.description,
        400,
      );
    }

    state.incident.status = "resolved";
    return {};
  }

  // ---------------------------------------------------------------------------
  // Calculations
  // ---------------------------------------------------------------------------
  getEngineeringHealthMetrics() {
    const deploys = this.enterpriseState.github.deployments;
    const deployFailRate =
      deploys.filter((d) => d.status === "failed").length /
      (deploys.length || 1);
    const deployScore = Math.max(0, 100 - deployFailRate * 100);

    const runs = this.enterpriseState.github.workflowRuns;
    const runFailRate =
      runs.filter((r) => r.conclusion === "failure").length /
      (runs.length || 1);
    const cicdScore = Math.max(0, 100 - runFailRate * 100);

    const sprints = this.enterpriseState.jira.sprints;
    let sprintScore = 100;
    if (sprints.length > 0) {
      const sp = sprints[0];
      const daysLeft = Math.max(
        1,
        Math.ceil(
          (new Date(sp.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      );
      const capacity = sp.velocity * daysLeft;
      if (capacity > 0) {
        sprintScore = Math.min(
          100,
          Math.round((capacity / (sp.storyPointsRemaining || 1)) * 100),
        );
      }
    }

    const activeIssues = this.enterpriseState.github.issues.length;
    const baseIssues = this.enterpriseState.github.averageIssueRate;
    const issueRatio = activeIssues / (baseIssues || 1);
    const issueScore =
      issueRatio <= 1.0 ? 100 : Math.max(0, 100 - (issueRatio - 1.0) * 50);

    const dd = this.enterpriseState.datadog;
    const cpuScore = dd.cpu > 70 ? Math.max(0, 100 - (dd.cpu - 70) * 3.3) : 100;
    const ramScore =
      dd.memory > 75 ? Math.max(0, 100 - (dd.memory - 75) * 4.0) : 100;
    const httpScore =
      dd.httpCheckFailures === 0 ? 100 : dd.httpCheckFailures === 1 ? 50 : 0;
    const infraScore = Math.round((cpuScore + ramScore + httpScore) / 3);

    // Apply degradation penalties from all active (unresolved) incidents
    let penaltyDeploy = 0, penaltyCicd = 0, penaltyInfra = 0, penaltyIssue = 0, penaltySprint = 0;
    for (const [, deg] of this.scenarioDegradations) {
      penaltyDeploy  = Math.max(penaltyDeploy,  deg.deployScore  ?? 0);
      penaltyCicd    = Math.max(penaltyCicd,    deg.cicdScore    ?? 0);
      penaltyInfra   = Math.max(penaltyInfra,   deg.infraScore   ?? 0);
      penaltyIssue   = Math.max(penaltyIssue,   deg.issueScore   ?? 0);
      penaltySprint  = Math.max(penaltySprint,  deg.sprintScore  ?? 0);
    }

    const effectiveDeploy  = Math.max(0, deployScore  - penaltyDeploy);
    const effectiveCicd    = Math.max(0, cicdScore    - penaltyCicd);
    const effectiveInfra   = Math.max(0, infraScore   - penaltyInfra);
    const effectiveIssue   = Math.max(0, issueScore   - penaltyIssue);
    const effectiveSprint  = Math.max(0, sprintScore  - penaltySprint);

    const finalScore = Math.round(
      effectiveDeploy  * 0.25 +
      effectiveCicd    * 0.2  +
      effectiveSprint  * 0.2  +
      effectiveIssue   * 0.15 +
      effectiveInfra   * 0.2,
    );

    return {
      engineeringHealthScore: finalScore,
      breakdown: {
        deploymentSuccess: Math.round(effectiveDeploy),
        cicdSuccess:       Math.round(effectiveCicd),
        sprintHealth:      Math.round(effectiveSprint),
        issueRate:         Math.round(effectiveIssue),
        infrastructureHealth: Math.round(effectiveInfra),
      },
    };
  }

  calculateEngineeringHealthScore(): number {
    return this.getEngineeringHealthMetrics().engineeringHealthScore;
  }

  recomputeDepartmentHealthScores() {
    const engHealth = this.calculateEngineeringHealthScore();

    const eng = this.departments.find((d) => d.departmentId === "engineering");
    if (eng) {
      eng.healthScore = engHealth;
      eng.status =
        engHealth >= 85 ? "healthy" : engHealth >= 65 ? "warning" : "critical";

      const open = this.incidents.filter(
        (i) =>
          i.status !== "resolved" &&
          i.affectedDepartments.includes("engineering"),
      );
      eng.summary =
        open.length > 0
          ? `${open.length} active incident(s): ${open.map((o) => o.title).join(", ")}.`
          : "All CI/CD pipelines green. Infrastructure metrics healthy.";
      eng.lastUpdated = new Date().toISOString();
    }

    const ops = this.departments.find((d) => d.departmentId === "operations");
    if (ops) {
      const openOps = this.incidents.filter(
        (i) =>
          i.status !== "resolved" &&
          i.affectedDepartments.includes("operations"),
      );
      ops.healthScore =
        openOps.length > 0
          ? openOps.some((i) => i.severity === "critical")
            ? 60
            : 78
          : 95;
      ops.status =
        ops.healthScore >= 85
          ? "healthy"
          : ops.healthScore >= 65
            ? "warning"
            : "critical";
      ops.summary =
        openOps.length > 0
          ? `Operations impacted by release/staffing risks.`
          : "Release schedules align with Jira progress. Sprint is on track.";
      ops.lastUpdated = new Date().toISOString();
    }

    const sup = this.departments.find((d) => d.departmentId === "support");
    if (sup) {
      const openSup = this.incidents.filter(
        (i) =>
          i.status !== "resolved" && i.affectedDepartments.includes("support"),
      );
      sup.healthScore = openSup.length > 0 ? 70 : 96;
      sup.status =
        sup.healthScore >= 85
          ? "healthy"
          : sup.healthScore >= 65
            ? "warning"
            : "critical";
      sup.summary =
        openSup.length > 0
          ? "Ticket queue rates elevated."
          : "Customer issue reports remain within baseline rates.";
      sup.lastUpdated = new Date().toISOString();
    }
  }

  // ---------------------------------------------------------------------------
  // Action Approvals & Notifications
  // ---------------------------------------------------------------------------
  approveAction(recommendationId: string, approve: boolean) {
    console.log(`[Protocol-0 approveAction] approveAction called with ID: "${recommendationId}" (type: ${typeof recommendationId})`);
    
    // Print all available recommendations in memory
    const allIds = this.incidents.flatMap(i => i.recommendations.map(r => r.recommendationId));
    console.log(`[Protocol-0 approveAction] Available recommendation IDs in memory: ${JSON.stringify(allIds)}`);

    let rec: Recommendation | undefined;
    let targetInc: Incident | undefined;

    for (const inc of this.incidents) {
      const r = inc.recommendations.find(
        (recItem) => recItem.recommendationId === recommendationId,
      );
      if (r) {
        rec = r;
        targetInc = inc;
        break;
      }
    }

    if (!rec || !targetInc) {
      console.log(`[Protocol-0 approveAction] Recommendation NOT found in incidents! returning found: false`);
      return { found: false as const };
    }

    if (!approve) {
      rec.status = "rejected";
      this.logAgentAction(
        "Action Agent",
        `User REJECTED recommendation ${recommendationId}`,
        `${rec.title} was declined.`,
      );
      return { found: true as const, recommendation: { ...rec } };
    }

    rec.status = "executed";
    this.logAgentAction(
      "Action Agent",
      `Executing approved action "${rec.title}" via ${rec.mcpServer}`,
      rec.description,
    );

    const state = this.enterpriseState;
    if (
      rec.title.includes("Rollback") ||
      rec.title.toLowerCase().includes("revert")
    ) {
      state.github.deployments = state.github.deployments.filter(
        (d) => d.status !== "failed",
      );
      state.datadog.cpu = 45;
    } else if (
      rec.title.includes("Reschedule") ||
      rec.title.toLowerCase().includes("postpone")
    ) {
      state.calendar.events.forEach((e) => {
        if (e.type === "release") {
          e.startTime = daysFromNow(4);
          e.endTime = daysFromNow(4.1);
        }
      });
    } else if (
      rec.title.includes("Replacement") ||
      rec.title.toLowerCase().includes("reassign")
    ) {
      state.jira.issues.forEach((i) => {
        if (i.assignee === "Alex Rivera") {
          i.assignee = "Sarah Jenkins";
        }
      });
    }

    const remainingPending = targetInc.recommendations.some(
      (r) => r.status === "pending",
    );
    console.log(`[Protocol-0 approveAction] Recommendation approved: ${recommendationId}`);
    console.log(`[Protocol-0 approveAction] Recommendations status: ${targetInc.recommendations.map(r => `${r.recommendationId}:${r.status}`).join(", ")}`);
    console.log(`[Protocol-0 approveAction] remainingPending: ${remainingPending}`);
    if (!remainingPending) {
      console.log(`[Protocol-0 approveAction] Resolving incident ${targetInc.incidentId} and pushing notifications...`);
      targetInc.status = "resolved";
      // Clear the degradation so engineering health recovers
      this.scenarioDegradations.delete(targetInc.incidentId);

      // Restore Kubernetes pods to healthy running states
      this.kubernetesPods.forEach((p) => {
        p.status = "Running";
        p.restarts = 0;
        p.reason = undefined;
        p.message = undefined;
        p.failedAt = undefined;
        if (p.podName === "gateway-service-84d7cb-mh22a") {
          p.cpuUsage = "120m";
          p.memoryUsage = "180Mi";
        } else if (p.podName === "auth-service-7cfbc6b-9p8l2") {
          p.cpuUsage = "85m";
          p.memoryUsage = "256Mi";
        } else if (p.podName === "payment-service-5dc89d-4xzwq") {
          p.cpuUsage = "95m";
          p.memoryUsage = "210Mi";
        } else if (p.podName === "database-pod-0") {
          p.cpuUsage = "310m";
          p.memoryUsage = "1024Mi";
        } else if (p.podName === "datadog-agent-88w9q") {
          p.cpuUsage = "45m";
          p.memoryUsage = "128Mi";
        }
      });
      this.logAgentAction(
        "Monitoring Agent",
        `Incident ${targetInc.incidentId} was fully resolved`,
        `All actions completed successfully.`,
      );

      // Push Slack resolution notification
      this.notificationLogs.unshift({
        id: `NOTIFY-SLACK-${Date.now()}`,
        type: "slack",
        timestamp: new Date().toISOString(),
        recipient: "#ops-alerts",
        subject: `RESOLVED: Incident ${targetInc.incidentId}`,
        content: `✅ *[Digital Twin Alert]* Incident *${targetInc.incidentId}* ("${targetInc.title}") has been fully resolved. All recommended actions were approved and successfully executed. Subsystem health is recovering.`,
      });

      // Push Gmail resolution notification
      this.notificationLogs.unshift({
        id: `NOTIFY-GMAIL-${Date.now()}`,
        type: "gmail",
        timestamp: new Date().toISOString(),
        recipient: "leadership-team@company.com",
        subject: `RESOLVED: Protocol-0 Incident Report - ${targetInc.incidentId}`,
        content: `<h2>Protocol-0 Resolution Report</h2>
<p><b>Incident ID:</b> ${targetInc.incidentId}<br>
<b>Status:</b> RESOLVED<br>
<b>Resolution Time:</b> ${new Date().toISOString()}</p>
<p>All recommended actions for <b>${targetInc.title}</b> have been executed successfully. Continuous SaaS checks are now passing and metrics are returning to nominal levels.</p>`,
      });
    }

    this.recomputeDepartmentHealthScores();

    return {
      found: true as const,
      recommendation: { ...rec },
      execution: {
        mcpServer: rec.mcpServer,
        result: `Action executed successfully through ${rec.mcpServer} MCP server.`,
        executedAt: new Date().toISOString(),
      },
    };
  }

  public async sendSimulatedSlackNotification(incident: Incident) {
    const channel = "#ops-alerts";
    const rec = incident.recommendations[0];
    const content = `⚠️ *[Digital Twin Alert]* ${incident.title} (${incident.severity.toUpperCase()})
*Root Cause:* ${incident.rootCause}
*Business Impact:* ${incident.businessImpact.summary}
*Proposed Action:* ${rec?.title || "None"} - _${rec?.description || ""}_
*Confidence:* ${incident.confidenceScore}% · *Incident ID:* ${incident.incidentId}`;

    this.notificationLogs.push({
      id: `NOTIFY-SLACK-${Date.now()}`,
      type: "slack",
      timestamp: new Date().toISOString(),
      recipient: channel,
      subject: `Alert: ${incident.title}`,
      content,
    });

    this.logAgentAction(
      "Action Agent",
      `Sent Slack Notification to ${channel}`,
      `Punchy summary of ${incident.incidentId} broadcasted.`,
      50,
    );

    // Call real incoming webhook if configured
    await this.publishSlackWebhook(content);
  }

  public sendSimulatedGmailNotification(incident: Incident) {
    const recipient = "leadership-team@company.com";
    const recList = incident.recommendations
      .map(
        (r) =>
          `<li><b>[${r.priority.toUpperCase()}] ${r.title}:</b> ${r.description} (Target Server: ${r.mcpServer})</li>`,
      )
      .join("");

    const content = `<h2>Protocol-0 Executive Incident Report</h2>
<p><b>Incident ID:</b> ${incident.incidentId}<br>
<b>Severity:</b> ${incident.severity.toUpperCase()}<br>
<b>Category:</b> ${incident.category}</p>

<h3>1. Root Cause Summary</h3>
<p>${incident.rootCause}</p>

<h3>2. Business Impact & Risk Analysis</h3>
<p>${incident.businessImpact.summary}</p>
<ul>
  <li>Engineering Risk: ${incident.businessImpact.engineeringRisk}</li>
  <li>Projected Launch Delay: ${incident.businessImpact.launchDelay}</li>
  <li>Customer Support Impact: ${incident.businessImpact.customerImpact}</li>
  <li>Revenue Risk: ${incident.businessImpact.revenueRisk}</li>
</ul>
<p><b>Projected Company Health:</b> ${incident.businessImpact.projectedHealthScore}%</p>

<h3>3. Recommended Actions (Pending Approval)</h3>
<ul>
  ${recList}
</ul>

<p>Confidence score computed by Infrastructure Agent: <b>${incident.confidenceScore}%</b></p>
<hr>
<p><i>This is an automated operational report generated by the Workplace Digital Twin multi-agent system. Click "Approve" in your console to execute these actions.</i></p>`;

    this.notificationLogs.push({
      id: `NOTIFY-GMAIL-${Date.now()}`,
      type: "gmail",
      timestamp: new Date().toISOString(),
      recipient,
      subject: `[CRITICAL ALERT] Digital Twin Operational Audit: ${incident.title}`,
      content,
    });

    this.logAgentAction(
      "Action Agent",
      `Sent Detailed Gmail Report to ${recipient}`,
      `Rich HTML email dispatch for ${incident.incidentId}.`,
      75,
    );
  }

  // ---------------------------------------------------------------------------
  // Direct Getters
  // ---------------------------------------------------------------------------
  getCompanyHealth() {
    const depts = this.departments;
    const overall =
      depts.length > 0
        ? Math.round(
            depts.reduce((sum, d) => sum + d.healthScore, 0) / depts.length,
          )
        : 0;

    const open = this.incidents.filter((i) => i.status !== "resolved");
    const critical = open.filter(
      (i) => i.severity === "critical" || i.severity === "high",
    );
    const topRecommendations = open
      .flatMap((i) => i.recommendations)
      .filter((r) => r.status === "pending");

    return {
      companyHealthScore: overall,
      status: this.statusFromScore(overall),
      openIncidents: open.length,
      criticalRisks: critical.length,
      departments: depts.map((d) => ({
        departmentId: d.departmentId,
        departmentName: d.departmentName,
        healthScore: d.healthScore,
        status: d.status,
        summary: d.summary,
        owningAgent: d.owningAgent,
        sources: d.sources,
      })),
      recommendations: topRecommendations.map((r) => ({
        recommendationId: r.recommendationId,
        incidentId: r.incidentId,
        priority: r.priority,
        title: r.title,
      })),
      lastUpdated: new Date().toISOString(),
    };
  }

  private statusFromScore(score: number): HealthStatus {
    if (score >= 85) return "healthy";
    if (score >= 65) return "warning";
    return "critical";
  }

  listIncidents() {
    return this.incidents.map((i) => ({
      incidentId: i.incidentId,
      title: i.title,
      category: i.category,
      severity: i.severity,
      status: i.status,
      timestamp: i.timestamp,
      confidenceScore: i.confidenceScore,
      affectedDepartments: i.affectedDepartments,
      affectedSystems: i.affectedSystems,
      openRecommendations: i.recommendations.filter(
        (r) => r.status === "pending",
      ).length,
    }));
  }

  getIncident(incidentId: string): Incident | undefined {
    return this.incidents.find(
      (i) => i.incidentId.toLowerCase() === incidentId.toLowerCase(),
    );
  }

  getRootCause(incidentId: string) {
    const inc = this.getIncident(incidentId);
    if (!inc) return undefined;
    return {
      incidentId: inc.incidentId,
      title: inc.title,
      rootCause: inc.rootCause,
      confidenceScore: inc.confidenceScore,
      trigger: inc.trigger,
      affectedSystems: inc.affectedSystems,
      analyzedBy: "Infrastructure Agent",
    };
  }

  getBusinessImpact(incidentId: string) {
    const inc = this.getIncident(incidentId);
    if (!inc) return undefined;
    return {
      incidentId: inc.incidentId,
      title: inc.title,
      analyzedBy: "Incident Commander Agent",
      ...inc.businessImpact,
      affectedDepartments: inc.affectedDepartments,
    };
  }

  getRecommendations(incidentId?: string) {
    const source = incidentId
      ? this.incidents.filter(
          (i) => i.incidentId.toLowerCase() === incidentId.toLowerCase(),
        )
      : this.incidents;
    const recs = source.flatMap((i) => {
      // If the incident has recommendations, return them as-is
      if (i.recommendations.length > 0) return i.recommendations;

      // If the incident is still being analyzed (pipeline not yet done), surface a
      // synthetic "processing" entry so the UI can show meaningful feedback
      const isPipelineRunning =
        i.status === "detected" ||
        i.status === "investigating" ||
        i.status === "analyzed";

      if (isPipelineRunning) {
        return [
          {
            recommendationId: `PROCESSING-${i.incidentId}`,
            incidentId: i.incidentId,
            priority: "high" as const,
            title: "⏳ AI Agents Analyzing Incident",
            description: `The multi-agent pipeline (Monitoring → Engineering → Incident Commander) is currently analyzing ${i.incidentId}: "${i.title}". Recommendations will appear here once analysis is complete. Please call getRecommendations again in a few seconds.`,
            mcpServer: "Protocol-0",
            status: "pending" as const,
            confidence: 0,
            evidence: i.trigger,
            businessImpact: "Under analysis by Incident Commander Agent.",
          },
        ];
      }

      return [];
    });

    // Inject zero_trust_token for action approvals
    const secret = process.env.ZERO_TRUST_SECRET || "default";
    const mappedRecs = recs.map((r) => {
      const token = crypto.createHmac("sha256", secret).update(r.recommendationId).digest("hex");
      return { ...r, zero_trust_token: token };
    });

    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return mappedRecs.sort((a, b) => order[a.priority] - order[b.priority]);
  }

  getAgentActivity() {
    return {
      pipeline: agentPipeline,
      logs: this.agentLogs.map((l) => ({ ...l })),
    };
  }

  async answerExecutiveQuery(question: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const open = this.incidents.filter((i) => i.status !== "resolved");
      const resolved = this.incidents.filter((i) => i.status === "resolved");
      const health = this.getCompanyHealth();
      const activePods = this.kubernetesPods;
      const recs = this.getRecommendations();

      const systemInstruction = `You are the AI Incident Commander Executive Advisor for Protocol-0.
Your task is to analyze the operational state of the enterprise and answer the executive's query accurately, factually, and professionally based on the provided live data.

Response format MUST be a single JSON object matching this schema:
{
  "answer": "Concise natural language answer highlighting live facts, incident names, statuses, or recommendations.",
  "relatedIncidents": ["INC-1001", "INC-1002"]
}`;

      const prompt = `Current Enterprise State:
- Overall Company Health: ${health.companyHealthScore}% (${health.status})
- Open Incidents: ${JSON.stringify(open.map(i => ({ incidentId: i.incidentId, title: i.title, severity: i.severity, status: i.status })))}
- Recent Resolved Incidents: ${JSON.stringify(resolved.map(i => ({ incidentId: i.incidentId, title: i.title })))}
- Recommendations to Resolve: ${JSON.stringify(recs.map(r => ({ recommendationId: r.recommendationId, incidentId: r.incidentId, title: r.title, description: r.description, status: r.status })))}
- Kubernetes Telemetry: ${JSON.stringify(activePods.map(p => ({ name: p.podName, status: p.status, restarts: p.restarts, reason: p.reason })))}

User's Executive Question:
"${question}"

Generate the JSON response matching the schema.`;

      try {
        const geminiResult = await this.callGemini(prompt, systemInstruction);
        if (geminiResult && typeof geminiResult === "object") {
          return {
            question,
            answer: geminiResult.answer || "No response received.",
            relatedIncidents: geminiResult.relatedIncidents || [],
            answeredBy: "Incident Commander Agent",
          };
        }
      } catch (err) {
        console.error("Gemini call failed inside answerExecutiveQuery:", err);
      }
    }

    // Smart local rule fallback
    const q = question.toLowerCase();
    const health = this.getCompanyHealth();
    const open = this.incidents.filter((i) => i.status !== "resolved");

    if (q.includes("incident") || q.includes("live") || q.includes("open") || q.includes("resolve") || q.includes("active")) {
      if (open.length === 0) {
        return {
          question,
          answer: `All systems nominal. There are currently no active/live incidents to resolve. Overall company health is at ${health.companyHealthScore}%.`,
          relatedIncidents: [],
          answeredBy: "Incident Commander Agent",
        };
      }
      return {
        question,
        answer: `There are currently ${open.length} active live incidents under analysis: ${open.map((i) => `${i.incidentId}: "${i.title}" (${i.severity})`).join("; ")}.`,
        relatedIncidents: open.map((i) => i.incidentId),
        answeredBy: "Incident Commander Agent",
      };
    }

    if (q.includes("recommendation") || q.includes("remediate") || q.includes("action") || q.includes("what is there to")) {
      const recs = this.getRecommendations().filter((r) => r.status === "pending");
      if (recs.length === 0) {
        return {
          question,
          answer: "There are currently no pending auto-remediation actions or recommendations.",
          relatedIncidents: [],
          answeredBy: "Incident Commander Agent",
        };
      }
      return {
        question,
        answer: `We have ${recs.length} pending recommendations to resolve the active issues: ${recs.map((r) => `${r.recommendationId}: "${r.title}"`).join("; ")}. You can approve them using the remediation widget.`,
        relatedIncidents: [...new Set(recs.map((r) => r.incidentId))],
        answeredBy: "Incident Commander Agent",
      };
    }

    if (
      q.includes("engineering") &&
      (q.includes("low") || q.includes("why") || q.includes("health"))
    ) {
      const eng = this.departments.find(
        (d) => d.departmentId === "engineering",
      );
      return {
        question,
        answer: `Engineering health is currently ${eng?.healthScore ?? 0}% (${eng?.status}). ${eng?.summary} Active incidents are processed by the Infrastructure Agent to diagnose root causes and suggest mitigations.`,
        relatedIncidents: this.incidents
          .filter(
            (i) =>
              i.status !== "resolved" &&
              i.affectedDepartments.includes("engineering"),
          )
          .map((i) => i.incidentId),
        answeredBy: "Incident Commander Agent",
      };
    }
    if (
      q.includes("release") ||
      q.includes("launch") ||
      q.includes("meeting")
    ) {
      return {
        question,
        answer: `We currently monitor calendar meetings and release windows. Open incidents will block or delay launch events if feature progress falls under 80%. I recommend postponing demo reviews or resolving the underlying database migrations if active.`,
        relatedIncidents: this.incidents
          .filter((i) => i.status !== "resolved")
          .map((i) => i.incidentId),
        answeredBy: "Incident Commander Agent",
      };
    }
    if (q.includes("pressure") || q.includes("most") || q.includes("worst")) {
      const sorted = [...this.departments].sort(
        (a, b) => a.healthScore - b.healthScore,
      );
      const worst = sorted[0];
      return {
        question,
        answer: `${worst.departmentName} is under the most pressure at ${worst.healthScore}% (${worst.status}). ${worst.summary}`,
        relatedIncidents: this.incidents
          .filter((i) => i.affectedDepartments.includes(worst.departmentId))
          .map((i) => i.incidentId),
        answeredBy: "Incident Commander Agent",
      };
    }
    if (q.includes("risk") || q.includes("summar")) {
      const openInc = this.incidents.filter((i) => i.status !== "resolved");
      return {
        question,
        answer: `Company health is ${health.companyHealthScore}% (${health.status}) with ${health.openIncidents} open incidents. Active alerts: ${openInc.length > 0 ? openInc.map((i) => `${i.title} (${i.severity})`).join("; ") : "None"}.`,
        relatedIncidents: openInc.map((i) => i.incidentId),
        answeredBy: "Incident Commander Agent",
      };
    }

    return {
      question,
      answer: `Company health is ${health.companyHealthScore}% (${health.status}). There are ${health.openIncidents} open incidents. Ask me about a department's health, meeting risk, or general operational risks.`,
      relatedIncidents: this.incidents
        .filter((i) => i.status !== "resolved")
        .map((i) => i.incidentId),
      answeredBy: "Incident Commander Agent",
    };
  }

  // ---------------------------------------------------------------------------
  // Data Fetchers for Integrations
  // ---------------------------------------------------------------------------
  async getKubernetesState() {
    return this.kubernetesPods;
  }

  async getPagerDutyIncidents() {
    const mockPath = path.resolve(process.cwd(), "mocks/pagerduty_seed.json");
    if (!fs.existsSync(mockPath)) {
      return [];
    }
    return JSON.parse(await fs.promises.readFile(mockPath, "utf-8"));
  }

  async getSecurityAuditLogs() {
    const mockPath = path.resolve(process.cwd(), "mocks/security_audit_seed.json");
    if (!fs.existsSync(mockPath)) {
      return [];
    }
    return JSON.parse(await fs.promises.readFile(mockPath, "utf-8"));
  }
}
