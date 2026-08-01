# DeploySense AI

DeploySense AI is an autonomous AI Incident Commander that investigates failed software deployments using multiple AI agents communicating through NitroStack's built-in MCP servers.

## Features

- **GitHub Integration**: Fetch commits and changed files.
- **Logs Analysis**: Search logs and retrieve fatal errors.
- **Metrics Monitoring**: Analyze CPU, Memory, and Error rates.
- **Kubernetes Insights**: Check pod statuses and restart counts.
- **Jira Automation**: Automatically create/update incident tickets.
- **Slack Notification**: Alert teams about incidents and resolutions.
- **Autonomous Investigation**: Coordinates evidence gathering and root cause analysis.
- **Report Generation**: Automatically builds an incident post-mortem report.

## Setup

1. Install dependencies: `npm install`
2. Build the project: `npm run build`
3. Start the server: `npm run start`

Built entirely with NitroStack.
