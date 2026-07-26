import { 
  ContextPack, 
  ApprovalTask, 
  WorkflowNode, 
  IntegrationItem, 
  KnowledgeArticle, 
  VectorMemoryNode, 
  Workspace, 
  AuditLogEntry, 
  NotificationItem,
  CalendarEventItem 
} from '../types';

export const CONTEXT_PACKS: ContextPack[] = [
  {
    id: 'business',
    name: 'Business & Management',
    category: 'Enterprise',
    description: 'Executive summaries, formal meeting minutes, strategic action items, department tasks, & risk analysis.',
    icon: 'Briefcase',
    color: 'from-blue-500 to-indigo-600',
    summaryStyle: 'Executive Summary & Key Takeaways',
    dashboardLayout: 'Department Kanban & Executive Overview',
    planningLogic: 'OKRs & Action Priority Matrix',
    timelineStyle: 'Quarterly Roadmap',
    reminderRules: 'Weekly Manager Escalations',
    notificationLogic: 'High Priority Email + Slack Digest',
    memoryStructure: 'Corporate Decisions & Strategy Graphs',
    analytics: 'Department Velocity & Time Saved',
    suggestedIntegrations: ['Slack', 'Jira', 'Notion', 'Google Calendar']
  },
  {
    id: 'software_dev',
    name: 'Software Development',
    category: 'Engineering',
    description: 'Technical summaries, architecture diagrams, dev tickets, sprint plans, bug lists, and release checklists.',
    icon: 'Code',
    color: 'from-cyan-500 to-blue-600',
    summaryStyle: 'Technical Specification & Architectural Decisions',
    dashboardLayout: 'Agile Sprint Board & Issue Tracker',
    planningLogic: 'Sprint Backlog & Dev Effort Estimation',
    timelineStyle: 'Sprint Burndown & Milestone Tracker',
    reminderRules: 'Daily Standup Reminders & PR Deadlines',
    notificationLogic: 'GitHub Pull Requests & Slack Alerts',
    memoryStructure: 'Code Base Architecture & API Schema Graphs',
    analytics: 'PR Turnaround & Dev Ticket Velocity',
    suggestedIntegrations: ['GitHub', 'Jira', 'Notion', 'Slack']
  },
  {
    id: 'hackathon',
    name: 'Hackathon & Innovation',
    category: 'Events',
    description: 'Problem statements, rapid feature breakdown, 24-hr timeline, README drafts, pitch decks, and demo scripts.',
    icon: 'Zap',
    color: 'from-amber-500 to-orange-600',
    summaryStyle: 'Elevator Pitch & Core Problem Definition',
    dashboardLayout: 'Feature Breakdown & Countdown Grid',
    planningLogic: 'MVP Prioritization (Must Have vs Nice to Have)',
    timelineStyle: 'Hourly Hackathon Countdown Timeline',
    reminderRules: 'Hourly Sub-goal Checkpoints',
    notificationLogic: 'Immediate In-App Banner & Discord/Slack',
    memoryStructure: 'Rapid Prototype Snippets & Tech Specs',
    analytics: 'Build Velocity & Pitch Readiness Score',
    suggestedIntegrations: ['GitHub', 'Notion', 'Slack', 'Google Calendar']
  },
  {
    id: 'university',
    name: 'University & Academia',
    category: 'Education',
    description: 'Lecture notes, assignment timelines, study checklists, revision outlines, presentation plans, and attendance.',
    icon: 'GraduationCap',
    color: 'from-purple-500 to-indigo-600',
    summaryStyle: 'Academic Lecture Digest & Key Concepts',
    dashboardLayout: 'Coursework Calendar & Study Checklist',
    planningLogic: 'Syllabus Milestone Planning',
    timelineStyle: 'Semester Exam Timeline',
    reminderRules: '48h Assignment Due Reminders',
    notificationLogic: 'Calendar Notifications & Mobile Alerts',
    memoryStructure: 'Subject Knowledge Graphs & Citation Library',
    analytics: 'Study Hours & Exam Coverage %',
    suggestedIntegrations: ['Notion', 'Google Calendar']
  },
  {
    id: 'finance',
    name: 'Finance & Accounting',
    category: 'Finance',
    description: 'Budget summaries, expense tracking, approval workflows, risk matrix, audit notes, and compliance checks.',
    icon: 'DollarSign',
    color: 'from-emerald-500 to-teal-600',
    summaryStyle: 'Financial Highlights & Expense Breakdown',
    dashboardLayout: 'Budget Allocation & Approval Matrix',
    planningLogic: 'Cost Benefit Analysis & Approval Pipeline',
    timelineStyle: 'Fiscal Quarter Milestones',
    reminderRules: 'Payment & Audit Due Alerts',
    notificationLogic: 'Critical Security Email & Digest',
    memoryStructure: 'Ledger Audit Trails & Decision Logs',
    analytics: 'Cost Variance & Audit Compliance Rate',
    suggestedIntegrations: ['Slack', 'Jira', 'Notion']
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Clinical',
    category: 'Medical',
    description: 'Clinical summaries, treatment timelines, medication plans, patient follow-ups, and HIPAA compliance logs.',
    icon: 'Activity',
    color: 'from-rose-500 to-pink-600',
    summaryStyle: 'Patient Consultation Summary & Diagnosis',
    dashboardLayout: 'Clinical Care Plan & Medication Schedule',
    planningLogic: 'Treatment Pathway Protocol',
    timelineStyle: 'Patient Recovery & Follow-up Timeline',
    reminderRules: 'Critical Medication Follow-up Reminders',
    notificationLogic: 'High Priority Secure Desktop Alert',
    memoryStructure: 'Patient Medical History & Symptom Graph',
    analytics: 'Patient Follow-up Rate & Treatment Adherence',
    suggestedIntegrations: ['Google Calendar', 'Notion']
  },
  {
    id: 'legal',
    name: 'Legal & Compliance',
    category: 'Legal',
    description: 'Case summaries, contract clauses, risk matrix, regulatory compliance action items, and court deadlines.',
    icon: 'ShieldCheck',
    color: 'from-slate-600 to-zinc-800',
    summaryStyle: 'Case Overview & Legal Precedents',
    dashboardLayout: 'Contract Review & Redline Workflow',
    planningLogic: 'Statutory Compliance Checklist',
    timelineStyle: 'Litigation Filing Timeline',
    reminderRules: 'Court Date & Filing Deadline Reminders',
    notificationLogic: 'Encrypted Urgent Email + Desktop',
    memoryStructure: 'Legal Precedent & Contract Clause Graph',
    analytics: 'Filing Compliance & Risk Exposure Metric',
    suggestedIntegrations: ['Notion', 'Google Calendar']
  },
  {
    id: 'product_planning',
    name: 'Product Planning & Strategy',
    category: 'Product',
    description: 'Product vision, feature specs, user story mapping, prioritization matrix, and launch checklists.',
    icon: 'Compass',
    color: 'from-violet-500 to-purple-600',
    summaryStyle: 'PRD (Product Requirement Document) Draft',
    dashboardLayout: 'Feature Matrix & RICE Scoreboard',
    planningLogic: 'User Story & Epics Mapping',
    timelineStyle: 'Product Roadmap Q1-Q4',
    reminderRules: 'Feature Freeze & Launch Alerts',
    notificationLogic: 'Slack Channel Sync & Notion Digest',
    memoryStructure: 'User Feedback & Feature Dependency Graphs',
    analytics: 'Feature Delivery Velocity & Adoption Score',
    suggestedIntegrations: ['Jira', 'Notion', 'Slack', 'Google Calendar']
  },
  {
    id: 'marketing',
    name: 'Marketing & Campaign Strategy',
    category: 'Marketing',
    description: 'Campaign briefs, content calendars, channel deliverables, creative assets, and lead conversion targets.',
    icon: 'Megaphone',
    color: 'from-pink-500 to-rose-600',
    summaryStyle: 'Campaign Creative Brief & Target Persona',
    dashboardLayout: 'Content Calendar & Asset Pipeline',
    planningLogic: 'Funnel Optimization Steps',
    timelineStyle: 'Campaign Launch Countdown',
    reminderRules: 'Content Publishing Alerts',
    notificationLogic: 'Slack Notifications & Calendar Reminders',
    memoryStructure: 'Brand Asset Library & Campaign Metrics Graph',
    analytics: 'Campaign Engagement & Lead Conversion Rates',
    suggestedIntegrations: ['Notion', 'Slack', 'Google Calendar']
  },
  {
    id: 'sales',
    name: 'Sales & Deal Pipeline',
    category: 'Sales',
    description: 'Prospect call notes, objection handling, deal stage updates, follow-up proposals, and pricing breakdown.',
    icon: 'TrendingUp',
    color: 'from-green-500 to-emerald-600',
    summaryStyle: 'Sales Discovery & Client Needs Analysis',
    dashboardLayout: 'Deal Stage Kanban (Lead -> Closed Won)',
    planningLogic: 'Objection Resolution & Next Step Plan',
    timelineStyle: 'Sales Cycle & Close Target Date',
    reminderRules: '24h Post-Call Client Follow-up Alert',
    notificationLogic: 'Slack Sales Channel Alert + Calendar Event',
    memoryStructure: 'Client Relationship & Purchasing History Graph',
    analytics: 'Pipeline Velocity & Win-Rate Ratio',
    suggestedIntegrations: ['Slack', 'Google Calendar', 'Notion']
  },
  {
    id: 'recruitment',
    name: 'Recruitment & HR',
    category: 'HR',
    description: 'Candidate interview evaluation, scorecard summary, offer letter action items, and onboarding checklists.',
    icon: 'Users',
    color: 'from-sky-500 to-blue-600',
    summaryStyle: 'Candidate Evaluation & Scorecard Overview',
    dashboardLayout: 'Hiring Funnel & Candidate Matrix',
    planningLogic: 'Onboarding Checklist & Orientation Plan',
    timelineStyle: 'Interview Rounds Timeline',
    reminderRules: 'Interviewer Scorecard Submission Reminder',
    notificationLogic: 'Email + Calendar Meeting Auto-Creation',
    memoryStructure: 'Candidate Skill & Experience Profile Graph',
    analytics: 'Time to Hire & Offer Acceptance Ratio',
    suggestedIntegrations: ['Google Calendar', 'Slack', 'Notion']
  },
  {
    id: 'customer_support',
    name: 'Customer Support & Success',
    category: 'Support',
    description: 'Customer feedback summaries, ticket escalation checklists, bug reports, and SLA compliance notes.',
    icon: 'Headphones',
    color: 'from-amber-600 to-yellow-500',
    summaryStyle: 'Incident Root Cause & Customer Feedback Digest',
    dashboardLayout: 'Ticket SLA & Escalation Board',
    planningLogic: 'Customer Resolution Workflow',
    timelineStyle: 'SLA Response Timeline',
    reminderRules: '1-Hour SLA Violation Warning',
    notificationLogic: 'High Priority Slack #support-urgent Channel',
    memoryStructure: 'Known Issue Solutions & Knowledge Base Index',
    analytics: 'First Contact Resolution & Customer CSAT Score',
    suggestedIntegrations: ['Jira', 'Slack', 'Notion']
  },
  {
    id: 'consulting',
    name: 'Consulting & Advisory',
    category: 'Consulting',
    description: 'Client audit reports, gap analysis, strategic recommendations, deliverables roadmap, and billing hours.',
    icon: 'Award',
    color: 'from-indigo-600 to-blue-700',
    summaryStyle: 'Executive Advisory Memo & Strategic Gap Analysis',
    dashboardLayout: 'Client Deliverable & Scope Matrix',
    planningLogic: 'Consulting Phase Milestone Execution',
    timelineStyle: 'Engagement Roadmap (Phase 1 to 4)',
    reminderRules: 'Weekly Client Steering Review Reminders',
    notificationLogic: 'Email Digest + Slack Notification',
    memoryStructure: 'Industry Benchmarks & Client Context Graphs',
    analytics: 'Billable Hours Efficiency & Milestone Completion',
    suggestedIntegrations: ['Notion', 'Google Calendar', 'Slack']
  },
  {
    id: 'operations',
    name: 'Operations & Supply Chain',
    category: 'Operations',
    description: 'Standard Operating Procedures (SOP), process bottleneck resolution, inventory logs, and vendor tasks.',
    icon: 'Sliders',
    color: 'from-teal-600 to-emerald-700',
    summaryStyle: 'Operational Bottleneck & SOP Update Digest',
    dashboardLayout: 'Supply Chain & Inventory Workflow Board',
    planningLogic: 'Process Optimization & Lean Steps',
    timelineStyle: 'Vendor Delivery & Maintenance Timeline',
    reminderRules: 'Inventory Low Stock & Maintenance Alerts',
    notificationLogic: 'Mobile Push + In-App Critical Alerts',
    memoryStructure: 'Facility Dependency & Vendor Relationship Graphs',
    analytics: 'Operational Throughput & Bottleneck Index',
    suggestedIntegrations: ['Jira', 'Notion', 'Slack']
  },
  {
    id: 'research',
    name: 'Research & R&D Lab',
    category: 'Science',
    description: 'Experiment logs, literature review summaries, hypothesis testing notes, data parameters, and lab protocols.',
    icon: 'Microscope',
    color: 'from-blue-600 to-indigo-800',
    summaryStyle: 'Experimental Findings & Methodological Notes',
    dashboardLayout: 'Lab Experiment & Data Logging Grid',
    planningLogic: 'Hypothesis Verification Workflow',
    timelineStyle: 'Research Grant & Publication Timeline',
    reminderRules: 'Lab Equipment Maintenance & Review Reminders',
    notificationLogic: 'Notion Sync + Academic Digest Email',
    memoryStructure: 'Scientific Citations & Experimental Data Graph',
    analytics: 'Experiment Repeatability Score & Milestone Rate',
    suggestedIntegrations: ['Notion', 'GitHub', 'Google Calendar']
  },
  {
    id: 'event_planning',
    name: 'Event & Conference Planning',
    category: 'Events',
    description: 'Venue run of show, speaker schedule, sponsor commitments, catering checklists, and volunteer assignments.',
    icon: 'Calendar',
    color: 'from-orange-500 to-amber-600',
    summaryStyle: 'Event Run of Show & Speaker Logistics',
    dashboardLayout: 'Vendor & Sponsor Coordination Board',
    planningLogic: 'Day-of Event Timeline Execution',
    timelineStyle: 'Event Countdown (D-90 to D-Day)',
    reminderRules: 'Vendor Payment & Confirmation Reminders',
    notificationLogic: 'SMS Alerts + Slack Announcement Channel',
    memoryStructure: 'Vendor Directory & Speaker Roster Graph',
    analytics: 'Sponsor Satisfaction & Event Execution Score',
    suggestedIntegrations: ['Google Calendar', 'Slack', 'Notion']
  },
  {
    id: 'ngo',
    name: 'NGO & Non-Profit Impact',
    category: 'Non-Profit',
    description: 'Community impact reports, donor updates, grant application action items, and volunteer deployment plans.',
    icon: 'Heart',
    color: 'from-red-500 to-rose-600',
    summaryStyle: 'Impact Assessment & Beneficiary Story Digest',
    dashboardLayout: 'Grant Application & Volunteer Deployment Board',
    planningLogic: 'Field Operation Plan',
    timelineStyle: 'Grant Disbursement Timeline',
    reminderRules: 'Grant Filing Deadline Alerts',
    notificationLogic: 'Email Newsletter + Slack Team Channel',
    memoryStructure: 'Donor Contributions & Field Location Graphs',
    analytics: 'Beneficiaries Reached & Grant Utilization Rate',
    suggestedIntegrations: ['Notion', 'Google Calendar', 'Slack']
  },
  {
    id: 'personal_productivity',
    name: 'Personal Productivity',
    category: 'Personal',
    description: 'Personal journal insights, daily habit goals, reading list notes, project ideas, and life planning checklists.',
    icon: 'UserCheck',
    color: 'from-emerald-500 to-lime-600',
    summaryStyle: 'Personal Action Digest & Mind Map',
    dashboardLayout: 'Habit Tracker & Personal Task Grid',
    planningLogic: 'Getting Things Done (GTD) Method',
    timelineStyle: 'Weekly Personal Goals Roadmap',
    reminderRules: 'Daily Evening Goal Review',
    notificationLogic: 'Browser & Mobile Push Notifications',
    memoryStructure: 'Personal Knowledge Base & Habit History',
    analytics: 'Goal Completion Rate & Habit Streak',
    suggestedIntegrations: ['Notion', 'Google Calendar']
  }
];

export const MOCK_APPROVAL_TASKS: ApprovalTask[] = [
  {
    id: 'task-101',
    title: 'Deploy FastAPI Auth Microservice to Staging (Render)',
    description: 'Configure JWT validation middleware, connect Supabase auth provider, and set up Docker environment variables.',
    priority: 'Critical',
    owner: 'Haswitheswari KamboJi (Lead AI Engineer)',
    deadline: 'Today at 5:00 PM (IST)',
    suggestedTool: 'GitHub',
    confidenceScore: 96,
    status: 'pending',
    department: 'Engineering'
  },
  {
    id: 'task-102',
    title: 'Create Jira Tickets for Sprint 24 AI Workflow Nodes',
    description: 'Auto-generate epic and user stories for Context Pack execution pipeline with MCP fallback logic.',
    priority: 'High',
    owner: 'Priya Sharma (Product Manager)',
    deadline: 'Tomorrow at 11:00 AM (IST)',
    suggestedTool: 'Jira',
    confidenceScore: 92,
    status: 'pending',
    department: 'Product'
  },
  {
    id: 'task-103',
    title: 'Publish Sprint 24 Architecture Decision Record (ADR)',
    description: 'Sync ChromaDB vector memory query schema and Notion knowledge hub structure with engineering team.',
    priority: 'High',
    owner: 'David Vance (Principal Architect)',
    deadline: 'Jul 27, 2026',
    suggestedTool: 'Notion',
    confidenceScore: 94,
    status: 'pending',
    department: 'Documentation'
  },
  {
    id: 'task-104',
    title: 'Schedule Client Architecture Review in Google Calendar',
    description: 'Auto-detect participant timezones (Asia/Kolkata, America/New_York) and send calendar invites with Meet link.',
    priority: 'Medium',
    owner: 'Sarah Jenkins (Account Director)',
    deadline: 'Jul 28, 2026',
    suggestedTool: 'Google Calendar',
    confidenceScore: 89,
    status: 'pending',
    department: 'Sales'
  },
  {
    id: 'task-105',
    title: 'Broadcast Novu Critical Alert to #engineering Slack Channel',
    description: 'Notify team regarding completed ChromaDB vector database index optimization.',
    priority: 'Low',
    owner: 'ContextOS AI Agent',
    deadline: 'Immediate',
    suggestedTool: 'Slack',
    confidenceScore: 98,
    status: 'pending',
    department: 'System'
  }
];

export const MOCK_WORKFLOW_NODES: WorkflowNode[] = [
  {
    id: 'node-1',
    name: 'Input Transcript Stream',
    type: 'trigger',
    status: 'completed',
    progress: 100,
    duration: '0.4s',
    retryCount: 0,
    logs: ['Received 4,520 bytes raw text audio transcript', 'Whisper STT confidence score: 98.4%', 'Stream validated successfully']
  },
  {
    id: 'node-2',
    name: 'Context Pack Engine (Software Dev)',
    type: 'context',
    status: 'completed',
    progress: 100,
    duration: '0.8s',
    retryCount: 0,
    logs: ['Manually selected Context Pack: Software Development', 'Applied Technical Summary Prompt Template', 'Loaded Sprint Planning & Bug List rules']
  },
  {
    id: 'node-3',
    name: 'AI Reasoning & Task Extractor',
    type: 'planner',
    status: 'completed',
    progress: 100,
    duration: '1.2s',
    retryCount: 0,
    logs: ['OpenAI GPT-4o context reasoning complete', 'Extracted 5 actionable engineering tasks', 'Detected deadlines & assigned priority weights']
  },
  {
    id: 'node-4',
    name: 'Human Approval Gate',
    type: 'approval',
    status: 'running',
    progress: 60,
    duration: '12.4s',
    retryCount: 0,
    logs: ['Generated 5 Human Approval Cards', 'Awaiting user action on Approve/Edit/Reject', '1 task pre-approved by workspace policy']
  },
  {
    id: 'node-5',
    name: 'MCP Router & Orchestrator',
    type: 'mcp',
    status: 'idle',
    progress: 0,
    duration: '0s',
    retryCount: 0,
    logs: ['Waiting for Human Approval Gate completion', 'MCP Plugin Manager initialized', 'Plugins ready: Jira, Notion, GitHub, Slack, Calendar']
  },
  {
    id: 'node-6',
    name: 'Notion Knowledge Hub Sync',
    type: 'integration',
    status: 'idle',
    progress: 0,
    duration: '0s',
    retryCount: 0,
    logs: ['Target Notion Database: Sprint Knowledge Base', 'OAuth Token validated']
  },
  {
    id: 'node-7',
    name: 'ChromaDB Memory Update',
    type: 'storage',
    status: 'idle',
    progress: 0,
    duration: '0s',
    retryCount: 0,
    logs: ['Generating 1536-dimensional OpenAI text-embedding-3 vectors', 'ChromaDB Collection: workspace_engineering_memory']
  }
];

export const MOCK_INTEGRATIONS: IntegrationItem[] = [
  {
    id: 'integ-slack',
    key: 'slack',
    name: 'Slack Workspaces',
    category: 'Communication',
    description: 'Dispatch real-time meeting summaries, action item digests, and critical approval alerts to Slack channels.',
    icon: 'MessageSquare',
    status: 'connected',
    connectedAccount: 'Acme Corp (#engineering-alerts)',
    permissions: ['chat:write', 'channels:read', 'incoming-webhook'],
    scopes: ['channels:history', 'users:read', 'files:write'],
    rateLimit: '100 req/min (Normal)',
    apiHealth: 100,
    lastSync: '2 minutes ago',
    logs: ['Webhook event delivered to #engineering-alerts', 'Bot token active', 'Health check OK'],
    usageCount: 420
  },
  {
    id: 'integ-jira',
    key: 'jira',
    name: 'Jira Software',
    category: 'Project Management',
    description: 'Auto-create issues, user stories, and sub-tasks with priority, assignee mapping, and sprint tags.',
    icon: 'CheckSquare',
    color: 'text-blue-400',
    status: 'connected',
    connectedAccount: 'acme-corp.atlassian.net (DEV Project)',
    permissions: ['write:jira-work', 'read:jira-work'],
    scopes: ['read:project:jira', 'write:issue:jira'],
    rateLimit: '250 req/min',
    apiHealth: 98,
    lastSync: '10 minutes ago',
    logs: ['Created issue DEV-842: FastAPI Auth Middleware', 'Synced assignee mapping for Priya Sharma'],
    usageCount: 312
  },
  {
    id: 'integ-notion',
    key: 'notion',
    name: 'Notion Knowledge Base',
    category: 'Documentation',
    description: 'Automatically publish meeting documentation, sprint notes, and context memory articles into Notion databases.',
    icon: 'BookOpen',
    status: 'connected',
    connectedAccount: 'ContextOS Organizational Hub',
    permissions: ['Read Content', 'Update Content', 'Insert Content'],
    scopes: ['database:read', 'database:write', 'page:write'],
    rateLimit: '3 req/sec',
    apiHealth: 100,
    lastSync: '1 hour ago',
    logs: ['Published Page: Sprint 24 Architecture Review', 'Updated database index with 4 tags'],
    usageCount: 580
  },
  {
    id: 'integ-github',
    key: 'github',
    name: 'GitHub Repositories',
    category: 'Version Control',
    description: 'Link action items to PRs, create repository issues, and track code architecture commitments.',
    icon: 'GitBranch',
    status: 'connected',
    connectedAccount: 'github.com/acme-org/contextos-app',
    permissions: ['repo:status', 'public_repo', 'issues:write'],
    scopes: ['repo', 'workflow', 'read:org'],
    rateLimit: '5,000 req/hour',
    apiHealth: 99,
    lastSync: '30 minutes ago',
    logs: ['Linked PR #42 to Jira DEV-842', 'Verified PAT token expiration: 90 days remaining'],
    usageCount: 189
  },
  {
    id: 'integ-calendar',
    key: 'calendar',
    name: 'Google Calendar API',
    category: 'Scheduling',
    description: 'Auto-create follow-up meetings, check participant availability, and convert across international timezones.',
    icon: 'Calendar',
    status: 'connected',
    connectedAccount: 'alex.rivers@acme.com',
    permissions: ['https://www.googleapis.com/auth/calendar'],
    scopes: ['calendar.events', 'calendar.readonly'],
    rateLimit: '1,000,000 req/day',
    apiHealth: 100,
    lastSync: '5 minutes ago',
    logs: ['Scheduled follow-up meeting for Sprint 25 Demo', 'Converted timezone UTC -> Asia/Kolkata (+5:30)'],
    usageCount: 760
  }
];

export const MOCK_KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: 'art-1',
    title: 'Sprint 24 Architectural Sync & FastAPI Microservices Strategy',
    meetingId: 'mtg-2401',
    date: 'Jul 25, 2026',
    contextPack: 'Software Development',
    summary: 'Decided to deploy FastAPI gateway with Supabase Auth validation, ChromaDB vector store running in persistent container mode, and MCP Plugin manager.',
    tags: ['Architecture', 'FastAPI', 'ChromaDB', 'Supabase'],
    topics: ['Microservice Decoupling', 'Vector Memory Storage', 'MCP Gateway Routing'],
    participants: ['Alex Rivers', 'Priya Sharma', 'David Vance'],
    decisions: [
      'Approved FastAPI as central microservice backend',
      'Selected Supabase Auth + JWT for multi-tenant verification',
      'Adopted ChromaDB vector embeddings with 1536 dims for context retrieval'
    ],
    pinned: true,
    archived: false,
    contentMarkdown: `
# Sprint 24 Architectural Sync

## Executive Summary
During this technical synchronization session, the engineering leadership evaluated the performance and scalability requirements for **ContextOS**.

### Key Architecture Decisions
1. **Frontend**: Next.js App Router (React + TypeScript + Tailwind CSS + Framer Motion) hosted on Vercel.
2. **Backend Gateway**: FastAPI microservices handling speech-to-text (Whisper), LLM pipeline orchestration (OpenAI / Gemini), and MCP Plugin execution.
3. **Database & Auth**: Supabase PostgreSQL for normalized multi-tenant schemas and Supabase Auth for MFA & JWT verification.
4. **Contextual Memory**: ChromaDB vector store enabling semantic search across past conversations.

## Action Items Created
- [x] [DEV-842] Configure FastAPI JWT Middleware
- [ ] [DEV-843] Initialize ChromaDB persistence container
- [ ] [DEV-844] Setup Novu notification webhooks
`,
    versions: [
      { version: 'v1.2', timestamp: 'Jul 25, 2026 14:30', author: 'David Vance', changeSummary: 'Added ChromaDB vector dimension specs' },
      { version: 'v1.0', timestamp: 'Jul 25, 2026 10:00', author: 'Priya Sharma', changeSummary: 'Initial publication from AI transcript' }
    ],
    comments: [
      { id: 'c1', author: 'Alex Rivers', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces', timestamp: 'Jul 25, 2026 15:10', text: 'Docker compose file updated for ChromaDB local persistence test!' }
    ]
  },
  {
    id: 'art-2',
    title: 'Q3 Enterprise Product Roadmap & Context Pack Matrix',
    meetingId: 'mtg-2402',
    date: 'Jul 24, 2026',
    contextPack: 'Product Planning & Strategy',
    summary: 'Reviewed 25+ Context Packs including Business, Healthcare, Legal, and Hackathon modes. Confirmed zero auto-classification policy.',
    tags: ['Product', 'Roadmap', 'ContextPacks', 'Enterprise'],
    topics: ['Manual Context Selection', 'Custom Pack Builder', 'Multi-tenant Governance'],
    participants: ['Priya Sharma', 'Sarah Jenkins', 'Elena Rostova'],
    decisions: [
      'Enforced manual context selection rule across all UI entry points',
      'Approved Custom Context Pack builder feature for Enterprise tier'
    ],
    pinned: true,
    archived: false,
    contentMarkdown: `
# Q3 Enterprise Product Roadmap

## Context Pack Strategy
ContextOS differentiates itself by rejecting automatic AI classification. Users explicitly choose their Context Pack before processing, guaranteeing exact tailored output without hallucination.

### Supported Packs
- **Enterprise & Tech**: Business, Software Dev, Hackathon, Finance, Legal
- **Specialized Industries**: Healthcare, Education, NGO, Government, Operations
`,
    versions: [
      { version: 'v1.0', timestamp: 'Jul 24, 2026 16:00', author: 'Priya Sharma', changeSummary: 'Initial roadmap document' }
    ],
    comments: []
  }
];

export const MOCK_VECTOR_NODES: VectorMemoryNode[] = [
  {
    id: 'vec-001',
    textSnippet: 'Decided to deploy FastAPI gateway with Supabase Auth validation and ChromaDB vector memory.',
    meetingTitle: 'Sprint 24 Architectural Sync',
    timestamp: 'Jul 25, 2026',
    similarityScore: 0.96,
    contextPack: 'Software Development',
    category: 'Architecture Decision',
    connectedEntities: ['FastAPI', 'Supabase', 'ChromaDB', 'Alex Rivers'],
    vectorDimensions: 1536
  },
  {
    id: 'vec-002',
    textSnippet: 'Manual Context Selection rule must be strictly enforced. Never auto-classify meeting context.',
    meetingTitle: 'Q3 Enterprise Product Roadmap',
    timestamp: 'Jul 24, 2026',
    similarityScore: 0.91,
    contextPack: 'Product Planning',
    category: 'Product Policy',
    connectedEntities: ['Context Pack Engine', 'Priya Sharma', 'Zero Auto-Classify'],
    vectorDimensions: 1536
  },
  {
    id: 'vec-003',
    textSnippet: 'Google Calendar API multi-timezone auto conversion configured for IST, EST, GMT, and JST.',
    meetingTitle: 'Global Client Operations Sync',
    timestamp: 'Jul 22, 2026',
    similarityScore: 0.88,
    contextPack: 'Operations',
    category: 'Integration Rule',
    connectedEntities: ['Google Calendar', 'Timezone Engine', 'Sarah Jenkins'],
    vectorDimensions: 1536
  }
];

export const MOCK_WORKSPACES: Workspace[] = [
  {
    id: 'ws-acme',
    name: 'Acme Global Enterprise',
    type: 'Company',
    membersCount: 48,
    departments: ['Engineering', 'Product', 'Sales', 'Finance', 'Legal', 'HR'],
    role: 'Administrator',
    projectsCount: 14
  },
  {
    id: 'ws-startup',
    name: 'NeuralFlow AI Lab',
    type: 'Startup',
    membersCount: 12,
    departments: ['AI Research', 'Frontend', 'Backend', 'Growth'],
    role: 'Owner',
    projectsCount: 6
  },
  {
    id: 'ws-hackathon',
    name: 'Hackathon Alpha Team',
    type: 'Hackathon Team',
    membersCount: 4,
    departments: ['Build Squad'],
    role: 'Owner',
    projectsCount: 2
  },
  {
    id: 'ws-univ',
    name: 'Stanford Computer Science R&D',
    type: 'University',
    membersCount: 85,
    departments: ['Distributed Systems', 'Machine Learning'],
    role: 'Lead',
    projectsCount: 8
  }
];

export const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-1',
    timestamp: '2026-07-25 22:45:12',
    actor: 'alex.rivers@acme.com',
    action: 'MFA_VERIFIED',
    resource: 'Supabase Auth Gateway',
    ip: '103.24.12.89 (Trusted Device)',
    status: 'Success'
  },
  {
    id: 'audit-2',
    timestamp: '2026-07-25 22:48:00',
    actor: 'priya.sharma@acme.com',
    action: 'MCP_PLUGIN_EXECUTE',
    resource: 'Jira API / Issue Creation',
    ip: '49.207.19.11',
    status: 'Success'
  },
  {
    id: 'audit-3',
    timestamp: '2026-07-25 22:50:33',
    actor: 'david.vance@acme.com',
    action: 'NOTION_DOC_PUBLISH',
    resource: 'Notion Database / Sprint 24',
    ip: '157.48.99.12',
    status: 'Success'
  }
];

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Critical Approval Needed',
    message: 'Task "Deploy FastAPI Auth Microservice to Staging" requires human review before MCP execution.',
    timestamp: '5m ago',
    priority: 'Critical',
    read: false,
    channel: 'In-App'
  },
  {
    id: 'notif-2',
    title: 'Notion Knowledge Hub Synced',
    message: 'Sprint 24 Architecture Review published to Notion workspace with 3 tagged decisions.',
    timestamp: '25m ago',
    priority: 'Medium',
    read: false,
    channel: 'In-App'
  },
  {
    id: 'notif-3',
    title: 'Calendar Meeting Conflict Auto-Resolved',
    message: 'Adjusted follow-up meeting to 4:30 PM IST for participant in America/New_York.',
    timestamp: '1h ago',
    priority: 'High',
    read: true,
    channel: 'Calendar'
  }
];

export const MOCK_CALENDAR_EVENTS: CalendarEventItem[] = [
  {
    id: 'cal-1',
    title: 'Sprint 25 Architecture & Planning Review',
    start: '2026-07-26T10:00:00+05:30',
    end: '2026-07-26T11:00:00+05:30',
    timezone: 'Asia/Kolkata (IST)',
    participants: ['alex.rivers@acme.com', 'priya.sharma@acme.com', 'david.vance@acme.com'],
    contextPack: 'Software Development',
    status: 'Scheduled'
  },
  {
    id: 'cal-2',
    title: 'Global Client Strategy Sync',
    start: '2026-07-27T18:30:00+05:30',
    end: '2026-07-27T19:30:00+05:30',
    timezone: 'America/New_York (EDT: 9:00 AM)',
    participants: ['sarah.jenkins@acme.com', 'client.exec@acme.com'],
    contextPack: 'Business & Management',
    status: 'Scheduled'
  }
];
