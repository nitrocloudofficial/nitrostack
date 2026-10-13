# Converra One - Complete Project Tree & File Map

This document outlines the full directory structure and provides an explanation of every folder in **Converra One**.

```
Converra_One/
├── .editorconfig                       # Code style consistency settings
├── .env.example                        # Comprehensive environment variables sample
├── .gitignore                          # Git ignore rules
├── .prettierrc                         # Code formatting config
├── eslint.config.js                    # ESLint flat configuration
├── nitrostack.config.ts                # NitroStack Cloud build and deployment configuration
├── Dockerfile                          # Production docker container image recipe
├── package.json                        # Project dependencies and script declarations
├── tsconfig.json                       # TypeScript compiler strict mode configuration
├── README.md                           # Project overview & quickstart guide
├── PROJECT_TREE.md                     # File tree and folder breakdown (this file)
├── IMPLEMENTATION_PLAN.md              # Multi-phase execution roadmap
├── ARCHITECTURE.md                     # Component hierarchy and design architecture
└── src/                                # Application Source Root
    ├── app.module.ts                   # Root NitroStack @McpApp module bootstrapper
    ├── index.ts                        # Application main entry point
    │
    ├── health/                         # Health monitoring subsystem
    │   ├── index.ts                    # Health module exports
    │   └── system.health.ts            # System memory & uptime health provider
    │
    ├── prompts/                        # MCP Prompts subsystem
    │   └── index.ts                    # MCP Prompt registry index
    │
    ├── resources/                      # MCP Resources subsystem
    │   └── index.ts                    # MCP Resource registry index
    │
    ├── tools/                          # MCP Tools subsystem
    │   └── index.ts                    # MCP Tool registry index
    │
    ├── shared/                         # Enterprise Shared Framework
    │   ├── index.ts                    # Main shared module barrel export
    │   │
    │   ├── abstracts/                  # Base abstract classes for OOP extension
    │   │   ├── BaseAgent.abstract.ts   # Core abstract class for AI Agents
    │   │   ├── BaseIntegration.abstract.ts # Core abstract class for Platform Connectors
    │   │   ├── BaseResource.abstract.ts# Core abstract class for MCP Resources
    │   │   ├── BaseTool.abstract.ts    # Core abstract class for MCP Tools
    │   │   ├── BaseWidget.abstract.ts  # Core abstract class for UI Dashboard Widgets
    │   │   └── index.ts
    │   │
    │   ├── config/                     # Application & Environment configuration
    │   │   ├── app.config.ts           # App metadata configuration
    │   │   ├── env.config.ts           # Strictly typed environment variables mapping
    │   │   ├── logger.config.ts        # Logger behavior configuration
    │   │   ├── mcp.config.ts           # MCP server metadata & transport setup
    │   │   ├── theme.config.ts         # Visual design tokens & theme setup
    │   │   └── index.ts
    │   │
    │   ├── constants/                  # System-wide constants & defaults
    │   │   ├── app.constants.ts        # Platforms, priority levels & default settings
    │   │   ├── theme.constants.ts      # Colors, typography & UI tokens
    │   │   └── index.ts
    │   │
    │   ├── enums/                      # Strictly typed domain Enums
    │   │   ├── agent.enum.ts           # AgentType enum
    │   │   ├── message.enum.ts         # MessageStatus enum
    │   │   ├── notification.enum.ts    # NotificationType enum
    │   │   ├── platform.enum.ts        # PlatformType enum (Gmail, Slack, Discord, etc.)
    │   │   ├── priority.enum.ts        # PriorityLevel enum (Urgent, High, Medium, Low)
    │   │   ├── task.enum.ts            # TaskStatus enum
    │   │   └── index.ts
    │   │
    │   ├── errors/                     # Project-wide custom error class strategy
    │   │   ├── AgentError.ts           # AI Agent execution error
    │   │   ├── ApplicationError.ts     # Base domain application error
    │   │   ├── IntegrationError.ts     # Third-party platform communication error
    │   │   ├── MCPError.ts             # MCP protocol error
    │   │   ├── ValidationError.ts      # Input schema validation error
    │   │   └── index.ts
    │   │
    │   ├── interfaces/                 # Pure TypeScript Data Models & DTOs
    │   │   ├── AgentResponse.interface.ts # Standardized agent output contract
    │   │   ├── CalendarEvent.interface.ts # Calendar event contract
    │   │   ├── Commitment.interface.ts  # Extracted commitment contract
    │   │   ├── Conversation.interface.ts # Conversation thread contract
    │   │   ├── DashboardData.interface.ts # Aggregated dashboard payload
    │   │   ├── Message.interface.ts     # Normalized message contract
    │   │   ├── Notification.interface.ts# Notification contract
    │   │   ├── PriorityResult.interface.ts# Priority scoring output contract
    │   │   ├── Reminder.interface.ts    # User reminder contract
    │   │   ├── ReplySuggestion.interface.ts# Suggested reply option contract
    │   │   ├── SearchResult.interface.ts # Search match contract
    │   │   ├── SummaryResult.interface.ts # Thread summary output contract
    │   │   ├── Task.interface.ts        # Task contract
    │   │   └── index.ts
    │   │
    │   ├── models/                     # OOP Domain Data Models
    │   │   ├── Calendar.model.ts       # Calendar collection model
    │   │   ├── Dashboard.model.ts      # Dashboard state model
    │   │   ├── Message.model.ts        # Message domain model
    │   │   ├── Search.model.ts         # Search result domain model
    │   │   ├── Task.model.ts           # Task domain model
    │   │   ├── UnifiedInbox.model.ts   # Multi-platform inbox aggregation model
    │   │   └── index.ts
    │   │
    │   └── utilities/                  # Shared Utility Classes & Helpers
    │       ├── ConfigManager.utility.ts# Singleton configuration manager
    │       ├── DateUtilities.utility.ts# Relative time & date formatting
    │       ├── EnvironmentLoader.utility.ts# Environment validator
    │       ├── ErrorHandler.utility.ts # Error logging & transformation
    │       ├── Logger.utility.ts       # Structured logging utility
    │       ├── MessageUtilities.utility.ts# Keyword extraction & string cleaning
    │       ├── ValidationUtilities.utility.ts# Format validation helpers
    │       ├── helpers.ts              # UUID, deepClone, safeParseJson helpers
    │       └── index.ts
    │
    ├── modules/                        # Domain Feature Modules (Agentic AI)
    │   ├── index.ts
    │   ├── calendar/index.ts           # Calendar scheduling assistant module
    │   ├── collector/index.ts          # Multi-channel message harvester module
    │   ├── memory/index.ts             # Commitment memory & context store module
    │   ├── orchestrator/index.ts       # Master agent workflow orchestrator module
    │   ├── priority/index.ts           # AI priority scoring & urgency classifier module
    │   ├── reply/index.ts              # Smart draft & reply generator module
    │   ├── search/index.ts             # Semantic & hybrid search engine module
    │   ├── summary/index.ts            # Executive summary & briefing module
    │   └── task/index.ts               # Automated task extraction module
    │
    ├── integrations/                   # Platform Connectors
    │   ├── index.ts
    │   ├── calendar/index.ts           # Google Calendar / iCal integration provider
    │   ├── discord/index.ts            # Discord API / Bot provider
    │   ├── github/index.ts             # GitHub REST/GraphQL provider
    │   ├── gmail/index.ts              # Gmail OAuth & API provider
    │   ├── notion/index.ts             # Notion API provider
    │   └── slack/index.ts              # Slack Bolt / Web API provider
    │
    └── widgets/                        # NitroStack Visual Dashboard Widgets
        ├── index.ts
        ├── briefing/index.ts           # Executive Briefing UI Card widget
        ├── calendar/index.ts           # Interactive Calendar View widget
        ├── dashboard/index.ts          # Main Overview Dashboard widget
        ├── inbox/index.ts              # Unified Inbox Stream widget
        ├── notifications/index.ts      # Notification Toast & Feed widget
        ├── search/index.ts             # Global Search Bar widget
        ├── settings/index.ts           # Platform Integration Settings widget
        ├── sidebar/index.ts            # Navigation Sidebar widget
        └── tasks/index.ts              # Task Kanban / List widget
```
