# Converra One - System Design & Interaction Lifecycle

Detailed specification of component interactions, data normalization models, and multi-agent lifecycle events.

---

## 🔄 Component Interaction Sequence

```
1. UI Widget Trigger
   └── Call API Layer (e.g., fetchUnifiedInbox)
       └── Invoke MCP Tool (getUnifiedInbox)
           └── Execute Workflow Service (InboxWorkflowService)
               └── Run Master Orchestrator (OrchestratorAgent)

2. Agent Pipeline Orchestration
   ├── CollectorAgent -> ConnectorManager -> Harvest Messages
   ├── PriorityAgent -> Calculate Urgency (0.00 - 1.00) & Priority Level
   ├── SummaryAgent -> Generate Executive Thread Summaries
   ├── TaskAgent -> Extract Deliverables, Action Items, Due Dates
   ├── CalendarAgent -> Detect Meetings & Conflict Check
   ├── MemoryAgent -> Track Cross-Channel Commitments
   └── ReplyAgent -> Generate Multi-Tone Smart Replies

3. Data Synchronization & Telemetry
   ├── Emit Agent Event Bus Traces (COLLECTION_COMPLETED, PRIORITY_SCORED, etc.)
   ├── Log Execution Trace to resource://agent/timeline
   └── Update Health Telemetry in resource://agent/health
```
