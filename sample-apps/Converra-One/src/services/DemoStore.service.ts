import { PlatformType } from '../shared/enums/platform.enum.js';
import { PriorityLevel } from '../shared/enums/priority.enum.js';
import { MessageStatus } from '../shared/enums/message.enum.js';
import { TaskStatus } from '../shared/enums/task.enum.js';
import { NotificationType } from '../shared/enums/notification.enum.js';
import { Message } from '../shared/interfaces/Message.interface.js';
import { Task } from '../shared/interfaces/Task.interface.js';
import { CalendarEvent } from '../shared/interfaces/CalendarEvent.interface.js';
import { Notification } from '../shared/interfaces/Notification.interface.js';
import { PlatformStatusResult } from './ConnectorManager.service.js';
import { SearchResult, SearchMatch } from '../shared/interfaces/SearchResult.interface.js';
import { ReplySuggestion } from '../shared/interfaces/ReplySuggestion.interface.js';

export interface GitHubIssueDemo {
  id: string;
  number: number;
  title: string;
  body: string;
  author: string;
  labels: string[];
  state: 'open' | 'closed';
  createdAt: Date;
}

export interface GitHubPRDemo {
  id: string;
  number: number;
  title: string;
  author: string;
  reviewers: string[];
  status: 'open' | 'merged' | 'draft';
  branch: string;
  updatedAt: Date;
}

export interface NotionPageDemo {
  id: string;
  title: string;
  category: 'Tasks' | 'Meeting Notes' | 'Sprint Goals' | 'Documentation' | 'Bug List' | 'Feature Requests' | 'Roadmap';
  author: string;
  lastEdited: Date;
}

export class DemoStoreService {
  private static instance: DemoStoreService;

  private messages: Message[] = [];
  private tasks: Task[] = [];
  private calendarEvents: CalendarEvent[] = [];
  private notifications: Notification[] = [];
  private githubIssues: GitHubIssueDemo[] = [];
  private githubPRs: GitHubPRDemo[] = [];
  private notionPages: NotionPageDemo[] = [];
  private replies: Map<string, ReplySuggestion> = new Map();

  constructor() {
    this.seedDemoData();
  }

  public static getInstance(): DemoStoreService {
    if (!DemoStoreService.instance) {
      DemoStoreService.instance = new DemoStoreService();
    }
    return DemoStoreService.instance;
  }

  private seedDemoData(): void {
    // ---------------------------------------------------------------
    // 1. GMAIL DEMO MESSAGES (30 Emails)
    // ---------------------------------------------------------------
    const now = new Date();
    const subHours = (h: number) => new Date(now.getTime() - h * 3600000);

    const gmailEmails: Message[] = [
      {
        id: 'gm-001',
        conversationId: 'conv-gm-001',
        platform: PlatformType.GMAIL,
        externalId: '88491',
        sender: { id: 'usr-prof', name: 'Dr. Evelyn Vance', email: 'e.vance@stanford.edu' },
        recipients: [{ id: 'usr-me', name: 'Alex Mercer', email: 'alex.mercer@converra.io' }],
        subject: 'URGENT: Review CS340 Final Project Architecture Blueprint',
        content: 'Hi Alex, regarding the distributed system blueprint: adjust raft consensus parameters in section 4.2 before our 3 PM call today. We need to lock in the timeout configs.',
        timestamp: subHours(1),
        status: MessageStatus.UNREAD,
        priority: PriorityLevel.URGENT,
        tags: ['Academic', 'Raft', 'Urgent']
      },
      {
        id: 'gm-002',
        conversationId: 'conv-gm-002',
        platform: PlatformType.GMAIL,
        externalId: '88492',
        sender: { id: 'usr-ceo', name: 'David Vance (CEO)', email: 'david.vance@converra.io' },
        recipients: [{ id: 'usr-me', name: 'Alex Mercer', email: 'alex.mercer@converra.io' }],
        subject: 'Q3 Strategic Growth & Enterprise AI Vision Blueprint',
        content: 'Alex, exceptional progress on the Converra One architecture. Board members were wowed by the NitroStack integration demo. Let us prepare slides for Q3 investor sync.',
        timestamp: subHours(2),
        status: MessageStatus.UNREAD,
        priority: PriorityLevel.HIGH,
        tags: ['Executive', 'Vision', 'Q3']
      },
      {
        id: 'gm-003',
        conversationId: 'conv-gm-003',
        platform: PlatformType.GMAIL,
        externalId: '88493',
        sender: { id: 'usr-hr', name: 'Jessica Hayes (HR Director)', email: 'jessica.hayes@converra.io' },
        recipients: [{ id: 'usr-me', name: 'Alex Mercer', email: 'alex.mercer@converra.io' }],
        subject: 'Annual Performance & Compensation Review Schedule',
        content: 'Hi Alex, please confirm your preferred time slot for your annual performance review next week. The review portal is open for self-assessment.',
        timestamp: subHours(3),
        status: MessageStatus.READ,
        priority: PriorityLevel.MEDIUM,
        tags: ['HR', 'Performance']
      },
      {
        id: 'gm-004',
        conversationId: 'conv-gm-004',
        platform: PlatformType.GMAIL,
        externalId: '88494',
        sender: { id: 'usr-recruiter', name: 'David Miller (Talent Acquisition)', email: 'd.miller@converra.io' },
        recipients: [{ id: 'usr-me', name: 'Alex Mercer', email: 'alex.mercer@converra.io' }],
        subject: 'Senior Staff AI Architect Candidate Profiles for Review',
        content: 'Attached are the resume packets for top 3 candidates for the Principal AI Engineer role. John Smith and Maya Lin look outstanding.',
        timestamp: subHours(4),
        status: MessageStatus.UNREAD,
        priority: PriorityLevel.MEDIUM,
        tags: ['Recruiting', 'Candidates']
      },
      {
        id: 'gm-005',
        conversationId: 'conv-gm-005',
        platform: PlatformType.GMAIL,
        externalId: '88495',
        sender: { id: 'usr-client', name: 'Robert Sterling (Acme Corp CTO)', email: 'rsterling@acmecorp.com' },
        recipients: [{ id: 'usr-me', name: 'Alex Mercer', email: 'alex.mercer@converra.io' }],
        subject: 'Enterprise SLA Agreement & SOC2 Compliance Audit Feedback',
        content: 'Hi Alex, Acme legal approved the enterprise SLA agreement. We are ready to initiate the enterprise roll-out for 500 seats once SOC2 report is shared.',
        timestamp: subHours(5),
        status: MessageStatus.UNREAD,
        priority: PriorityLevel.HIGH,
        tags: ['Client', 'Acme', 'SOC2']
      },
      {
        id: 'gm-006',
        conversationId: 'conv-gm-006',
        platform: PlatformType.GMAIL,
        externalId: '88496',
        sender: { id: 'usr-billing', name: 'GCP Billing System', email: 'no-reply-billing@cloud.google.com' },
        recipients: [{ id: 'usr-me', name: 'Alex Mercer', email: 'alex.mercer@converra.io' }],
        subject: 'Invoice #INV-2026-089: Google Cloud Infrastructure Services',
        content: 'Your Google Cloud Platform billing statement for July 2026 is ready. Total: $4,280.40. Payment will be automatically processed via primary credit card.',
        timestamp: subHours(6),
        status: MessageStatus.READ,
        priority: PriorityLevel.LOW,
        tags: ['Finance', 'Invoice', 'GCP']
      },
      {
        id: 'gm-007',
        conversationId: 'conv-gm-007',
        platform: PlatformType.GMAIL,
        externalId: '88497',
        sender: { id: 'usr-sec', name: 'DevOps Security Automated Alert', email: 'security-alerts@converra.io' },
        recipients: [{ id: 'usr-me', name: 'Alex Mercer', email: 'alex.mercer@converra.io' }],
        subject: 'SECURITY ALERT: Suspicious API Key Access Attempt Blocked',
        content: 'Automated threat protection blocked an unauthenticated API key attempt originating from IP 198.51.100.42. Key has been revoked automatically.',
        timestamp: subHours(7),
        status: MessageStatus.UNREAD,
        priority: PriorityLevel.URGENT,
        tags: ['Security', 'Alert']
      },
      {
        id: 'gm-008',
        conversationId: 'conv-gm-008',
        platform: PlatformType.GMAIL,
        externalId: '88498',
        sender: { id: 'usr-news', name: 'TechCrunch AI Weekly Digest', email: 'newsletters@techcrunch.com' },
        recipients: [{ id: 'usr-me', name: 'Alex Mercer', email: 'alex.mercer@converra.io' }],
        subject: 'Top AI Agent Architecture Trends 2026: The Rise of Protocol-Driven Workspaces',
        content: 'This week in AI: How Model Context Protocol (MCP) and multi-agent orchestration frameworks like NitroStack are reshaping workplace communication.',
        timestamp: subHours(8),
        status: MessageStatus.READ,
        priority: PriorityLevel.LOW,
        tags: ['Newsletter', 'AI']
      },
      {
        id: 'gm-009',
        conversationId: 'conv-gm-009',
        platform: PlatformType.GMAIL,
        externalId: '88499',
        sender: { id: 'usr-marketing', name: 'Elena Rostova (Marketing)', email: 'elena.rostova@converra.io' },
        recipients: [{ id: 'usr-me', name: 'Alex Mercer', email: 'alex.mercer@converra.io' }],
        subject: 'Q3 Product Launch Campaign Collateral & Video Demo Review',
        content: 'Hey Alex, final video assets for the Converra One hackathon demo are ready! Please review the 3-minute product trailer before we publish.',
        timestamp: subHours(9),
        status: MessageStatus.READ,
        priority: PriorityLevel.MEDIUM,
        tags: ['Marketing', 'Assets']
      },
      {
        id: 'gm-010',
        conversationId: 'conv-gm-010',
        platform: PlatformType.GMAIL,
        externalId: '88500',
        sender: { id: 'usr-aws', name: 'AWS Billing Notification', email: 'no-reply@amazon.com' },
        recipients: [{ id: 'usr-me', name: 'Alex Mercer', email: 'alex.mercer@converra.io' }],
        subject: 'Invoice #AWS-99182: Monthly Infrastructure Bill Statement',
        content: 'Your AWS monthly invoice for Converra production cluster services has been generated. Amount due: $1,850.00.',
        timestamp: subHours(10),
        status: MessageStatus.READ,
        priority: PriorityLevel.LOW,
        tags: ['Finance', 'Invoice', 'AWS']
      }
    ];

    // Add 20 more realistic emails to reach 30
    for (let i = 11; i <= 30; i++) {
      const senders = [
        { name: 'Marcus Brody', email: 'marcus.brody@converra.io' },
        { name: 'Sarah Chen', email: 'sarah.chen@converra.io' },
        { name: 'Stanford CS Department', email: 'cs-dept@stanford.edu' },
        { name: 'GitHub Enterprise Admin', email: 'support@github.com' },
        { name: 'Slack Billing', email: 'billing@slack.com' }
      ];
      const sender = senders[i % senders.length];
      gmailEmails.push({
        id: `gm-0${i}`,
        conversationId: `conv-gm-0${i}`,
        platform: PlatformType.GMAIL,
        externalId: `${88500 + i}`,
        sender: { id: `usr-gen-${i}`, name: sender.name, email: sender.email },
        recipients: [{ id: 'usr-me', name: 'Alex Mercer', email: 'alex.mercer@converra.io' }],
        subject: `Workspace Update #${i}: Operational & Technical Sync Points`,
        content: `Detailed operational update regarding sprint deliverable #${i}. All dependencies checked with clean builds across worker clusters.`,
        timestamp: subHours(10 + i),
        status: i % 2 === 0 ? MessageStatus.UNREAD : MessageStatus.READ,
        priority: i % 5 === 0 ? PriorityLevel.URGENT : (i % 3 === 0 ? PriorityLevel.HIGH : PriorityLevel.MEDIUM),
        tags: ['Work', 'Update']
      });
    }

    this.messages.push(...gmailEmails);

    // ---------------------------------------------------------------
    // 2. SLACK DEMO MESSAGES (40 Messages)
    // ---------------------------------------------------------------
    const channels = ['#engineering-core', '#marketing-launch', '#sales-enterprise', '#devops-infra', '#announcements', '#support-tickets', '#random'];
    const slackUsers = [
      { name: 'Sarah Chen', email: 'sarah.chen@converra.io' },
      { name: 'Marcus Brody', email: 'marcus.brody@converra.io' },
      { name: 'Elena Rostova', email: 'elena.rostova@converra.io' },
      { name: 'Alex Mercer', email: 'alex.mercer@converra.io' },
      { name: 'John Smith', email: 'john.smith@converra.io' }
    ];

    const slackMessages: Message[] = [
      {
        id: 'slk-001',
        conversationId: 'conv-slk-001',
        platform: PlatformType.SLACK,
        externalId: 'slk-99120',
        sender: { id: 'usr-devlead', name: 'Sarah Chen (Lead Architect)', email: 'sarah.chen@converra.io' },
        recipients: [{ id: 'usr-me', name: 'Alex Mercer', email: 'alex.mercer@converra.io' }],
        subject: 'NitroStack Core v1.4 Deployment Blockers',
        content: '@alex The release candidate for NitroStack v1.4 hit a memory leak on worker node 3. Need GC parameters review before approving PR #342.',
        timestamp: subHours(2),
        status: MessageStatus.UNREAD,
        priority: PriorityLevel.HIGH,
        tags: ['Slack', '#engineering-core', 'PR #342']
      },
      {
        id: 'slk-002',
        conversationId: 'conv-slk-002',
        platform: PlatformType.SLACK,
        externalId: 'slk-99121',
        sender: { id: 'usr-designer', name: 'Marcus Brody', email: 'marcus.brody@converra.io' },
        recipients: [{ id: 'usr-me', name: 'Alex Mercer', email: 'alex.mercer@converra.io' }],
        subject: 'Glassmorphism Theme Tokens Ready',
        content: '@alex Check out `#design-system`! Updated dark mode glassmorphism gradients and frosted panel CSS values.',
        timestamp: subHours(3),
        status: MessageStatus.UNREAD,
        priority: PriorityLevel.MEDIUM,
        tags: ['Slack', '#design-system']
      }
    ];

    for (let i = 3; i <= 40; i++) {
      const u = slackUsers[i % slackUsers.length];
      const ch = channels[i % channels.length];
      slackMessages.push({
        id: `slk-0${i}`,
        conversationId: `conv-slk-0${i}`,
        platform: PlatformType.SLACK,
        externalId: `slk-${99120 + i}`,
        sender: { id: `usr-slk-${i}`, name: u.name, email: u.email },
        recipients: [{ id: 'usr-me', name: 'Alex Mercer', email: 'alex.mercer@converra.io' }],
        subject: `Slack Discussion in ${ch}`,
        content: `Team sync discussion item #${i} in ${ch}: @alex Please verify endpoint response time under high concurrency tests. Reaction: 🚀 ✅`,
        timestamp: subHours(3 + i * 0.5),
        status: i % 3 === 0 ? MessageStatus.UNREAD : MessageStatus.READ,
        priority: i % 7 === 0 ? PriorityLevel.HIGH : PriorityLevel.MEDIUM,
        tags: ['Slack', ch]
      });
    }

    this.messages.push(...slackMessages);

    // ---------------------------------------------------------------
    // 3. GITHUB DEMO NOTIFICATIONS (10 Notifications) & ISSUES / PRs
    // ---------------------------------------------------------------
    const githubMessages: Message[] = [
      {
        id: 'gh-001',
        conversationId: 'conv-gh-001',
        platform: PlatformType.GITHUB,
        externalId: 'gh-44102',
        sender: { id: 'usr-ghbot', name: 'GitHub Actions Bot' },
        recipients: [{ id: 'usr-me', name: 'Alex Mercer', email: 'alex.mercer@converra.io' }],
        subject: '[CI/CD] Build Succeeded: converra-one/main (Commit 8d3a1f9)',
        content: 'Pipeline #1842 completed successfully in 2m 14s. 142 unit tests passed with 0 failures.',
        timestamp: subHours(1),
        status: MessageStatus.READ,
        priority: PriorityLevel.MEDIUM,
        tags: ['GitHub', 'CI/CD', 'Passing']
      },
      {
        id: 'gh-002',
        conversationId: 'conv-gh-002',
        platform: PlatformType.GITHUB,
        externalId: 'gh-44103',
        sender: { id: 'usr-devlead', name: 'Sarah Chen' },
        recipients: [{ id: 'usr-me', name: 'Alex Mercer', email: 'alex.mercer@converra.io' }],
        subject: '[Pull Request Review] PR #342: Fix worker node 3 memory leak',
        content: 'Sarah Chen requested your review on PR #342: "Adjust V8 garbage collector heap size allocation parameters for NitroStack node runtime."',
        timestamp: subHours(2),
        status: MessageStatus.UNREAD,
        priority: PriorityLevel.HIGH,
        tags: ['GitHub', 'PR #342', 'Review']
      }
    ];

    for (let i = 3; i <= 10; i++) {
      githubMessages.push({
        id: `gh-00${i}`,
        conversationId: `conv-gh-00${i}`,
        platform: PlatformType.GITHUB,
        externalId: `gh-${44100 + i}`,
        sender: { id: `usr-gh-${i}`, name: i % 2 === 0 ? 'GitHub Actions Bot' : 'Sarah Chen' },
        recipients: [{ id: 'usr-me', name: 'Alex Mercer', email: 'alex.mercer@converra.io' }],
        subject: `[GitHub Notification #${i}] converra-one repository event`,
        content: `Issue #${100 + i} updated with new comments regarding API routing parameters and schema definitions.`,
        timestamp: subHours(i * 1.5),
        status: i % 2 === 0 ? MessageStatus.UNREAD : MessageStatus.READ,
        priority: PriorityLevel.MEDIUM,
        tags: ['GitHub', 'Repo']
      });
    }

    this.messages.push(...githubMessages);

    // 20 GitHub Issues
    for (let i = 1; i <= 20; i++) {
      this.githubIssues.push({
        id: `issue-${i}`,
        number: 100 + i,
        title: i === 1 ? 'Worker node 3 heap memory leak under stress test' : (i === 2 ? 'Add PKCE OAuth 2.0 authorization support' : `Issue #${100 + i}: Optimization for query handler module`),
        body: `Detailed bug reproduction steps and expected versus actual behavior for GitHub repository issue #${100 + i}.`,
        author: i % 2 === 0 ? 'sarahchen' : 'alexmercer',
        labels: i % 3 === 0 ? ['bug', 'high-priority'] : ['enhancement', 'core'],
        state: i > 15 ? 'closed' : 'open',
        createdAt: subHours(i * 4)
      });
    }

    // 8 GitHub PRs
    const prTitles = [
      'PR #342: Fix worker node 3 memory leak',
      'PR #345: OAuth 2.0 automatic token refresh & reactive 401 handling',
      'PR #349: NitroStack Core v1.4 SDK upgrade',
      'PR #352: Figma design tokens sync for dark glassmorphism theme',
      'PR #355: Vector DB index query optimization',
      'PR #360: React 18 hydration mismatch fix in widget container',
      'PR #362: Multi-platform attachment parsing service',
      'PR #368: Priority agent scoring model calibration'
    ];
    prTitles.forEach((t, idx) => {
      this.githubPRs.push({
        id: `pr-${idx + 1}`,
        number: 340 + idx,
        title: t,
        author: idx % 2 === 0 ? 'alexmercer' : 'sarahchen',
        reviewers: ['sarahchen', 'marcusbrody'],
        status: idx === 0 ? 'open' : (idx < 5 ? 'merged' : 'draft'),
        branch: `feature/branch-${idx + 1}`,
        updatedAt: subHours(idx * 2)
      });
    }      );

    // ---------------------------------------------------------------
    // 4. DISCORD DEMO MESSAGES (20 Messages)
    // ---------------------------------------------------------------
    for (let i = 1; i <= 20; i++) {
      this.messages.push({
        id: `dsc-0${i}`,
        conversationId: `conv-dsc-0${i}`,
        platform: PlatformType.DISCORD,
        externalId: `dsc-${10920 + i}`,
        sender: { id: `usr-dsc-${i}`, name: i % 2 === 0 ? 'Marcus Brody' : 'Community Bot' },
        recipients: [{ id: 'usr-me', name: 'Alex Mercer', email: 'alex.mercer@converra.io' }],
        subject: `Discord Developer Channel Updates #${i}`,
        content: i === 1 ? 'Hey Alex! Updated Figma design tokens for dark glassmorphism gradients and frosted UI panels.' : `Discord community feed message #${i}: Feedback regarding NitroStack widget layout on mobile devices.`,
        timestamp: subHours(i * 1.2),
        status: i % 3 === 0 ? MessageStatus.UNREAD : MessageStatus.READ,
        priority: PriorityLevel.LOW,
        tags: ['Discord', 'Community']
      });
    }

    // ---------------------------------------------------------------
    // 5. NOTION DEMO PAGES & MESSAGES (20 Pages)
    // ---------------------------------------------------------------
    const notionCats: NotionPageDemo['category'][] = ['Tasks', 'Meeting Notes', 'Sprint Goals', 'Documentation', 'Bug List', 'Feature Requests', 'Roadmap'];
    for (let i = 1; i <= 20; i++) {
      const title = i === 1 ? 'Q3 Product Roadmap & Agentic AI Milestone Update' : (i === 2 ? 'System Architecture Blueprint & MCP Data Flow' : `Notion Workspace Spec #${i}: Feature Architecture`);
      this.notionPages.push({
        id: `ntn-${77410 + i}`,
        title,
        category: notionCats[i % notionCats.length],
        author: i % 2 === 0 ? 'Elena Rostova' : 'Alex Mercer',
        lastEdited: subHours(i * 2)
      });

      this.messages.push({
        id: `ntn-msg-0${i}`,
        conversationId: `conv-ntn-0${i}`,
        platform: PlatformType.NOTION,
        externalId: `ntn-${77410 + i}`,
        sender: { id: `usr-ntn-${i}`, name: 'Elena Rostova' },
        recipients: [{ id: 'usr-me', name: 'Alex Mercer', email: 'alex.mercer@converra.io' }],
        subject: `[Notion Update] ${title}`,
        content: `Updated Notion document "${title}". Alex, please check assigned deliverables and mark estimated completion dates.`,
        timestamp: subHours(i * 2.5),
        status: i % 4 === 0 ? MessageStatus.UNREAD : MessageStatus.READ,
        priority: PriorityLevel.MEDIUM,
        tags: ['Notion', notionCats[i % notionCats.length]]
      });
    }

    // ---------------------------------------------------------------
    // 6. GOOGLE CALENDAR DEMO EVENTS (15 Events)
    // ---------------------------------------------------------------
    this.calendarEvents = [
      {
        id: 'evt-01',
        title: 'Prof. Vance CS340 Project Architecture Call',
        description: '15-min sync to review Raft consensus parameters and blueprint updates.',
        startTime: new Date(now.getTime() + 3600000), // 1 hour from now
        endTime: new Date(now.getTime() + 4500000),
        isAllDay: false,
        location: 'Google Meet',
        meetingUrl: 'https://meet.google.com/abc-defg-hij',
        organizer: { name: 'Dr. Evelyn Vance', email: 'e.vance@stanford.edu', responseStatus: 'accepted' },
        attendees: [
          { name: 'Dr. Evelyn Vance', email: 'e.vance@stanford.edu', responseStatus: 'accepted' },
          { name: 'Alex Mercer', email: 'alex.mercer@converra.io', responseStatus: 'accepted' }
        ],
        platform: PlatformType.CALENDAR
      },
      {
        id: 'evt-02',
        title: 'Daily Engineering Core Standup',
        description: 'Daily team sync discussing release candidate blockers, memory leaks, and PR #342.',
        startTime: new Date(now.getTime() + 7200000),
        endTime: new Date(now.getTime() + 9000000),
        isAllDay: false,
        location: 'Slack Huddle',
        meetingUrl: 'https://slack.com/huddle/converra-eng',
        organizer: { name: 'Sarah Chen', email: 'sarah.chen@converra.io', responseStatus: 'accepted' },
        attendees: [
          { name: 'Sarah Chen', email: 'sarah.chen@converra.io', responseStatus: 'accepted' },
          { name: 'Alex Mercer', email: 'alex.mercer@converra.io', responseStatus: 'accepted' },
          { name: 'Marcus Brody', email: 'marcus.brody@converra.io', responseStatus: 'accepted' }
        ],
        platform: PlatformType.CALENDAR
      },
      {
        id: 'evt-03',
        title: 'Figma Dark Glassmorphism Theme Review',
        description: 'Review updated Figma design tokens, card borders, and color variables.',
        startTime: new Date(now.getTime() + 14400000),
        endTime: new Date(now.getTime() + 16200000),
        isAllDay: false,
        location: 'Google Meet',
        meetingUrl: 'https://meet.google.com/xyz-design-tok',
        organizer: { name: 'Marcus Brody', email: 'marcus.brody@converra.io', responseStatus: 'accepted' },
        attendees: [
          { name: 'Marcus Brody', email: 'marcus.brody@converra.io', responseStatus: 'accepted' },
          { name: 'Alex Mercer', email: 'alex.mercer@converra.io', responseStatus: 'accepted' }
        ],
        platform: PlatformType.CALENDAR
      },
      {
        id: 'evt-04',
        title: 'Converra One Enterprise Client Demonstration',
        description: 'Live hackathon presentation and judges demonstration of multi-agent workspace.',
        startTime: new Date(now.getTime() + 21600000),
        endTime: new Date(now.getTime() + 25200000),
        isAllDay: false,
        location: 'Zoom Main Room',
        meetingUrl: 'https://zoom.us/j/991204812',
        organizer: { name: 'Elena Rostova', email: 'elena@converra.io', responseStatus: 'accepted' },
        attendees: [
          { name: 'Elena Rostova', email: 'elena@converra.io', responseStatus: 'accepted' },
          { name: 'Alex Mercer', email: 'alex.mercer@converra.io', responseStatus: 'accepted' }
        ],
        platform: PlatformType.CALENDAR
      },
      {
        id: 'evt-05',
        title: 'Technical Architecture Interview: Senior AI Engineer',
        description: 'Interview candidate John Smith for Principal AI Engineer position.',
        startTime: new Date(now.getTime() + 28800000),
        endTime: new Date(now.getTime() + 32400000),
        isAllDay: false,
        location: 'Google Meet',
        meetingUrl: 'https://meet.google.com/interview-john',
        organizer: { name: 'David Miller', email: 'd.miller@converra.io', responseStatus: 'accepted' },
        attendees: [
          { name: 'David Miller', email: 'd.miller@converra.io', responseStatus: 'accepted' },
          { name: 'Alex Mercer', email: 'alex.mercer@converra.io', responseStatus: 'accepted' }
        ],
        platform: PlatformType.CALENDAR
      }
    ];

    const sampleEventTitles = [
      'Team Lunch @ Palo Alto Tech Hub',
      'AI Innovation Hackathon Presentation Session',
      'Sarah\'s Birthday Celebration Sync',
      'Flight Confirmation Sync: SFO to NYC AI Summit',
      'CS340 Blueprint Submission Final Deadline',
      'Q3 Sprint Planning & Backlog Grooming',
      'DevOps Incident Postmortem & Worker Node Analysis',
      'SOC2 Security Compliance Audit Review',
      'Executive Board Sync & Product Vision Review',
      'Product Launch Retrospective & Celebration'
    ];

    sampleEventTitles.forEach((t, idx) => {
      this.calendarEvents.push({
        id: `evt-${idx + 6}`,
        title: t,
        description: `Scheduled calendar item: ${t}. All attendees notified.`,
        startTime: new Date(now.getTime() + (idx + 6) * 10800000),
        endTime: new Date(now.getTime() + (idx + 6) * 10800000 + 1800000),
        isAllDay: false,
        location: 'Google Meet',
        meetingUrl: 'https://meet.google.com/demo-meet',
        organizer: { name: 'Sarah Chen', email: 'sarah.chen@converra.io', responseStatus: 'accepted' },
        attendees: [{ name: 'Alex Mercer', email: 'alex.mercer@converra.io', responseStatus: 'accepted' }],
        platform: PlatformType.CALENDAR
      });
    });

    // ---------------------------------------------------------------
    // 7. DEMO TASKS (Extracted Deliverables)
    // ---------------------------------------------------------------
    this.tasks = [
      {
        id: 'task-01',
        title: 'Adjust Raft Consensus Timeout Parameters for Prof. Vance',
        description: 'Review section 4.2 of CS340 blueprint and submit updated config params prior to 3 PM review call.',
        status: TaskStatus.PENDING,
        priority: PriorityLevel.URGENT,
        sourcePlatform: PlatformType.GMAIL,
        sourceMessageId: 'gm-001',
        assignee: 'Alex Mercer',
        dueDate: new Date(now.getTime() + 3600000),
        createdAt: subHours(1),
        updatedAt: subHours(1),
        tags: ['Academic', 'Raft', 'Urgent']
      },
      {
        id: 'task-02',
        title: 'Investigate NitroStack Worker Node 3 Memory Leak (PR #342)',
        description: 'Analyze heap snapshot from stress test on worker node 3 with Sarah Chen.',
        status: TaskStatus.IN_PROGRESS,
        priority: PriorityLevel.HIGH,
        sourcePlatform: PlatformType.SLACK,
        sourceMessageId: 'slk-001',
        assignee: 'Alex Mercer',
        dueDate: new Date(now.getTime() + 7200000),
        createdAt: subHours(2),
        updatedAt: subHours(2),
        tags: ['Backend', 'Memory', 'PR #342']
      },
      {
        id: 'task-03',
        title: 'Update Notion Deliverables for Q3 MCP Integration Roadmap',
        description: 'Fill in estimated completion dates for agentic workflow milestones.',
        status: TaskStatus.PENDING,
        priority: PriorityLevel.MEDIUM,
        sourcePlatform: PlatformType.NOTION,
        sourceMessageId: 'ntn-msg-01',
        assignee: 'Alex Mercer',
        dueDate: new Date(now.getTime() + 14400000),
        createdAt: subHours(3),
        updatedAt: subHours(3),
        tags: ['Product', 'Roadmap']
      },
      {
        id: 'task-04',
        title: 'Review Marcus Figma Design Tokens for Glassmorphism Cards',
        description: 'Validate color variables in theme.config.ts against Figma specifications.',
        status: TaskStatus.COMPLETED,
        priority: PriorityLevel.LOW,
        sourcePlatform: PlatformType.DISCORD,
        sourceMessageId: 'dsc-01',
        assignee: 'Alex Mercer',
        dueDate: subHours(24),
        createdAt: subHours(30),
        updatedAt: subHours(12),
        tags: ['UI/UX', 'Done']
      }
    ];

    // ---------------------------------------------------------------
    // 8. DEMO NOTIFICATIONS
    // ---------------------------------------------------------------
    this.notifications = [
      {
        id: 'notif-01',
        type: NotificationType.MESSAGE_URGENT,
        title: 'Urgent Email from Prof. Evelyn Vance',
        body: 'CS340 Raft consensus blueprint requires immediate timeout adjustment prior to 3 PM call.',
        priority: PriorityLevel.URGENT,
        isRead: false,
        createdAt: subHours(1),
        metadata: { sourcePlatform: 'GMAIL', messageId: 'gm-001' }
      },
      {
        id: 'notif-02',
        type: NotificationType.TASK_DUE,
        title: 'Task Due in 2 Hours',
        body: 'Investigate NitroStack Worker Node 3 Memory Leak (PR #342)',
        priority: PriorityLevel.HIGH,
        isRead: false,
        createdAt: subHours(2),
        metadata: { taskId: 'task-02' }
      },
      {
        id: 'notif-03',
        type: NotificationType.AI_SUMMARY_READY,
        title: 'Daily AI Briefing Synthesized',
        body: 'Priority Agent scored 2 urgent threads across 100+ items. Calendar synchronized cleanly.',
        priority: PriorityLevel.MEDIUM,
        isRead: true,
        createdAt: subHours(4)
      }
    ];
  }

  // ---------------------------------------------------------------
  // PUBLIC READ & WRITE METHODS (IN-MEMORY STATE)
  // ---------------------------------------------------------------

  public getMessages(): Message[] {
    return this.messages;
  }

  public getMessagesByPlatform(platform: PlatformType): Message[] {
    return this.messages.filter(m => m.platform === platform);
  }

  public markMessageAsRead(id: string): Message | undefined {
    const msg = this.messages.find(m => m.id === id || m.externalId === id);
    if (msg) {
      msg.status = MessageStatus.READ;
    }
    return msg;
  }

  public archiveMessage(id: string): boolean {
    const idx = this.messages.findIndex(m => m.id === id || m.externalId === id);
    if (idx !== -1) {
      this.messages.splice(idx, 1);
      return true;
    }
    return false;
  }

  public getCalendarEvents(): CalendarEvent[] {
    return this.calendarEvents;
  }

  public addCalendarEvent(event: Partial<CalendarEvent>): CalendarEvent {
    const newEvent: CalendarEvent = {
      id: event.id || `evt-${Date.now()}`,
      title: event.title || 'New AI Calendar Event',
      description: event.description || 'Generated by Converra AI Agent',
      startTime: event.startTime || new Date(),
      endTime: event.endTime || new Date(Date.now() + 1800000),
      isAllDay: Boolean(event.isAllDay),
      location: event.location || 'Google Meet',
      meetingUrl: event.meetingUrl || 'https://meet.google.com/converra-ai',
      organizer: event.organizer || { name: 'Alex Mercer', email: 'alex.mercer@converra.io', responseStatus: 'accepted' },
      attendees: event.attendees || [],
      platform: PlatformType.CALENDAR
    };

    this.calendarEvents.push(newEvent);
    return newEvent;
  }

  public getTasks(): Task[] {
    return this.tasks;
  }

  public addTask(task: Partial<Task>): Task {
    const newTask: Task = {
      id: task.id || `task-${Date.now()}`,
      title: task.title || 'New Actionable Deliverable',
      description: task.description || 'Extracted automatically from conversation',
      status: task.status || TaskStatus.PENDING,
      priority: task.priority || PriorityLevel.MEDIUM,
      sourcePlatform: task.sourcePlatform || PlatformType.GMAIL,
      sourceMessageId: task.sourceMessageId || 'gm-001',
      assignee: task.assignee || 'Alex Mercer',
      dueDate: task.dueDate || new Date(Date.now() + 86400000),
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: task.tags || ['Action Item']
    };

    this.tasks.push(newTask);
    return newTask;
  }

  public updateTaskStatus(id: string, status: TaskStatus): Task | undefined {
    const t = this.tasks.find(tk => tk.id === id);
    if (t) {
      t.status = status;
      t.updatedAt = new Date();
    }
    return t;
  }

  public getNotifications(): Notification[] {
    return this.notifications;
  }

  public addNotification(notif: Partial<Notification>): Notification {
    const newNotif: Notification = {
      id: notif.id || `notif-${Date.now()}`,
      type: notif.type || NotificationType.SYSTEM_STATUS,
      title: notif.title || 'Notification',
      body: notif.body || '',
      priority: notif.priority || PriorityLevel.MEDIUM,
      isRead: false,
      createdAt: new Date(),
      metadata: notif.metadata
    };
    this.notifications.unshift(newNotif);
    return newNotif;
  }

  public getPlatformStatuses(): PlatformStatusResult[] {
    return [
      { platform: PlatformType.GMAIL, name: 'Gmail Workspace', status: 'connected', lastSync: 'Just now', account: 'alex.mercer@converra.io', activeCount: this.getMessagesByPlatform(PlatformType.GMAIL).length },
      { platform: PlatformType.SLACK, name: 'Slack HQ', status: 'connected', lastSync: 'Just now', account: '#engineering-core', activeCount: this.getMessagesByPlatform(PlatformType.SLACK).length },
      { platform: PlatformType.DISCORD, name: 'Discord Devs', status: 'connected', lastSync: 'Just now', account: 'AlexM#4920', activeCount: this.getMessagesByPlatform(PlatformType.DISCORD).length },
      { platform: PlatformType.GITHUB, name: 'GitHub Enterprise', status: 'connected', lastSync: 'Just now', account: 'converra-labs', activeCount: this.getMessagesByPlatform(PlatformType.GITHUB).length },
      { platform: PlatformType.NOTION, name: 'Notion Workspace', status: 'connected', lastSync: 'Just now', account: 'Engineering Hub', activeCount: this.getMessagesByPlatform(PlatformType.NOTION).length },
      { platform: PlatformType.CALENDAR, name: 'Google Calendar', status: 'connected', lastSync: 'Just now', account: 'alex.mercer@converra.io', activeCount: this.calendarEvents.length }
    ];
  }

  public saveReply(suggestion: ReplySuggestion): void {
    this.replies.set(suggestion.messageId, suggestion);
  }

  public getReply(messageId: string): ReplySuggestion | undefined {
    return this.replies.get(messageId);
  }

  public getGitHubIssues(): GitHubIssueDemo[] {
    return this.githubIssues;
  }

  public getGitHubPRs(): GitHubPRDemo[] {
    return this.githubPRs;
  }

  public getNotionPages(): NotionPageDemo[] {
    return this.notionPages;
  }

  // ---------------------------------------------------------------
  // SEARCH ENGINE OVER DEMO DATASET
  // ---------------------------------------------------------------

  public search(query: string, filters?: Record<string, unknown>): SearchResult {
    const startTime = Date.now();
    const qLower = (query || '').toLowerCase().trim();

    const matches: SearchMatch[] = [];

    // Search messages
    this.messages.forEach((msg) => {
      const matchText = `${msg.subject || ''} ${msg.content || ''} ${msg.sender.name || ''} ${msg.sender.email || ''} ${msg.tags?.join(' ') || ''}`.toLowerCase();
      if (!qLower || matchText.includes(qLower) || (qLower === 'invoice' && matchText.includes('invoice')) || (qLower === 'john' && matchText.includes('john'))) {
        const score = qLower && matchText.includes(qLower) ? 0.95 : 0.75;
        matches.push({
          id: msg.id,
          type: 'message',
          platform: msg.platform,
          title: msg.subject || 'Communication',
          snippet: (msg.content || '').substring(0, 140) + '...',
          timestamp: new Date(msg.timestamp),
          score,
          metadata: { sender: msg.sender.name, priority: msg.priority }
        });
      }
    });

    // Search calendar events
    this.calendarEvents.forEach((evt) => {
      const matchText = `${evt.title} ${evt.description || ''} ${evt.organizer?.name || ''} ${evt.location || ''}`.toLowerCase();
      if (qLower && matchText.includes(qLower)) {
        matches.push({
          id: evt.id,
          type: 'calendar_event',
          platform: PlatformType.CALENDAR,
          title: evt.title,
          snippet: evt.description || '',
          timestamp: new Date(evt.startTime),
          score: 0.90,
          metadata: { organizer: evt.organizer?.name || 'Organizer', location: evt.location }
        });
      }
    });

    // Search Notion pages
    this.notionPages.forEach((page) => {
      const matchText = `${page.title} ${page.category} ${page.author}`.toLowerCase();
      if (qLower && matchText.includes(qLower)) {
        matches.push({
          id: page.id,
          type: 'conversation',
          platform: PlatformType.NOTION,
          title: page.title,
          snippet: `Category: ${page.category} | Author: ${page.author}`,
          timestamp: new Date(page.lastEdited),
          score: 0.85,
          metadata: { category: page.category }
        });
      }
    });


    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    const duration = Date.now() - startTime;
    return {
      query: query || '*',
      totalMatches: matches.length,
      results: matches,
      searchTimeMs: duration,
      executedAt: new Date()
    };
  }
}
