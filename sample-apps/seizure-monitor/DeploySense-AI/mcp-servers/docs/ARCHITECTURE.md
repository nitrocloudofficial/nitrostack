# Architecture Overview

DeploySense AI uses a centralized **Investigation Module** as the main orchestrator, which communicates with several peripheral NitroStack modules.

## Component Interaction

1. **Investigation Module**: The core component that receives incident requests. It calls out to:
2. **Evidence Collection**:
   - `GitHub Module` (Commits, files)
   - `Logs Module` (Error traces)
   - `Metrics Module` (CPU, Memory, Error rates)
   - `Kubernetes Module` (Pod health)
3. **Notification & Tracking**:
   - `Jira Module` (Ticket creation)
   - `Slack Module` (Alerts)
4. **Reporting**:
   - `Report Module` (Generates a full timeline and root cause summary)

Data is mocked locally via JSON files in the `/data` directory.
