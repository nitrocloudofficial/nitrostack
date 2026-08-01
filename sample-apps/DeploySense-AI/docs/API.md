# DeploySense AI - API & MCP Tools Reference

## GitHub Module
- `getRecentCommits`: Get recent commits from the repository.
- `getCommitDetails`: Get details for a specific commit hash.
- `getChangedFiles`: Get changed files for recent commits.

## Logs Module
- `searchLogs`: Search logs for a specific query.
- `latestErrors`: Get latest error and fatal logs.
- `getServiceLogs`: Get logs for a specific service.

## Metrics Module
- `getCpuUsage`: Get CPU usage metrics.
- `getMemoryUsage`: Get memory usage metrics.
- `getErrorRate`: Get error rate metrics.
- `getResponseTime`: Get response time metrics.

## Kubernetes Module
- `getPodStatus`: Get status of a specific pod.
- `getDeploymentStatus`: Get status of a specific deployment.
- `getRestartCount`: Get restart count for a pod.

## Jira Module
- `createIncidentTicket`: Create a new incident ticket in Jira.
- `updateIncidentTicket`: Update an existing incident ticket in Jira.

## Slack Module
- `sendIncidentAlert`: Send an incident alert to a Slack channel.
- `sendResolutionMessage`: Send a resolution message to a Slack channel.

## Investigation Module
- `investigateIncident`: Investigate an incident by gathering evidence and determining root cause.

## Report Module
- `generateIncidentSummary`: Generate an incident summary.
- `getRootCauseAnalysis`: Get root cause analysis.
- `getEvidenceTimeline`: Get evidence timeline.
- `getRecommendedActions`: Get recommended actions.
- `getResolutionStatus`: Get resolution status.
