import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';
import { Tool } from '../../../../core/tool.js';
import { BM25SearchTransform } from '../bm25-search.transform.js';

function create50EnterpriseTools(): Tool[] {
  const tools: Tool[] = [];

  // 1. Database Domain (10 tools)
  const dbToolSpecs = [
    { name: 'pg_query', desc: 'Execute an arbitrary SQL query on PostgreSQL', params: { query: z.string(), timeout: z.number().optional() } },
    { name: 'pg_insert', desc: 'Insert new row records into specified table', params: { table: z.string(), record: z.record(z.any()) } },
    { name: 'pg_update', desc: 'Update existing table records matching predicate', params: { table: z.string(), id: z.string(), values: z.record(z.any()) } },
    { name: 'pg_create_table', desc: 'Create a new database table schema', params: { tableName: z.string(), columns: z.array(z.string()) } },
    { name: 'pg_explain_plan', desc: 'Explain slow sql query execution plan and analyze cost', params: { sql: z.string(), analyze: z.boolean().optional() } },
    { name: 'pg_list_tables', desc: 'List all relational database tables in current schema', params: { schema: z.string().optional() } },
    { name: 'pg_vacuum', desc: 'Reclaim storage and optimize PostgreSQL tables', params: { full: z.boolean().optional(), table: z.string().optional() } },
    { name: 'pg_drop_index', desc: 'Drop an unused or redundant database index', params: { indexName: z.string() } },
    { name: 'pg_analyze', desc: 'Collect statistics about contents of database tables', params: { table: z.string().optional() } },
    { name: 'pg_dump', desc: 'Export PostgreSQL database backup dump to file', params: { outputUri: z.string(), format: z.enum(['tar', 'sql']).optional() } },
  ];

  // 2. Payments / Stripe Domain (10 tools)
  const stripeToolSpecs = [
    { name: 'stripe_charge_customer', desc: 'Charge customer credit card for order balance', params: { customerId: z.string(), amountCents: z.number() } },
    { name: 'stripe_create_invoice', desc: 'Generate billing invoice for customer subscription', params: { customerId: z.string(), items: z.array(z.string()) } },
    { name: 'stripe_refund_payment', desc: 'Refund customer order payment transaction', params: { chargeId: z.string(), reason: z.string().optional() } },
    { name: 'stripe_list_subscriptions', desc: 'Retrieve recurring customer subscriptions', params: { status: z.string().optional(), limit: z.number().optional() } },
    { name: 'stripe_cancel_subscription', desc: 'Immediately cancel active recurring subscription', params: { subId: z.string() } },
    { name: 'stripe_update_card', desc: 'Update saved customer credit card or payment method', params: { customerId: z.string(), token: z.string() } },
    { name: 'stripe_create_customer', desc: 'Register a new paying customer entity in Stripe', params: { email: z.string(), name: z.string() } },
    { name: 'stripe_retrieve_balance', desc: 'Check current payout balance and pending transfers', params: {} },
    { name: 'stripe_payout', desc: 'Trigger manual bank payout transfer from balance', params: { amount: z.number(), currency: z.string() } },
    { name: 'stripe_webhook', desc: 'Verify incoming webhook signature and parse event', params: { rawBody: z.string(), signature: z.string() } },
  ];

  // 3. Issue Tracking / Jira Domain (10 tools)
  const jiraToolSpecs = [
    { name: 'jira_create_issue', desc: 'Create a new bug ticket or engineering story', params: { project: z.string(), summary: z.string(), description: z.string() } },
    { name: 'jira_assign_ticket', desc: 'Assign bug or feature ticket to developer assignee', params: { issueKey: z.string(), username: z.string() } },
    { name: 'jira_transition_status', desc: 'Move ticket to In Progress, Review, or Done', params: { issueKey: z.string(), transitionId: z.string() } },
    { name: 'jira_add_comment', desc: 'Post a comment on Jira issue discussion', params: { issueKey: z.string(), comment: z.string() } },
    { name: 'jira_list_sprints', desc: 'List active and planned agile sprint boards', params: { boardId: z.number() } },
    { name: 'jira_get_backlog', desc: 'Retrieve prioritized product backlog ticket items', params: { boardId: z.number() } },
    { name: 'jira_attach_file', desc: 'Upload file or screenshot attachment to Jira issue', params: { issueKey: z.string(), fileUri: z.string() } },
    { name: 'jira_delete_issue', desc: 'Permanently delete accidental duplicate issue', params: { issueKey: z.string() } },
    { name: 'jira_link_issues', desc: 'Create blocking or duplicate link between issues', params: { inwardKey: z.string(), outwardKey: z.string(), linkType: z.string() } },
    { name: 'jira_search_jql', desc: 'Search issues using JQL structured query syntax', params: { jql: z.string(), limit: z.number().optional() } },
  ];

  // 4. Code / GitHub Domain (10 tools)
  const githubToolSpecs = [
    { name: 'github_create_pr', desc: 'Open pull request for branch code review', params: { repo: z.string(), head: z.string(), base: z.string(), title: z.string() } },
    { name: 'github_merge_pr', desc: 'Merge pull request to main target branch', params: { repo: z.string(), prNumber: z.number(), mergeMethod: z.enum(['squash', 'rebase', 'merge']).optional() } },
    { name: 'github_add_reviewers', desc: 'Request code reviews from team members on PR', params: { repo: z.string(), prNumber: z.number(), reviewers: z.array(z.string()) } },
    { name: 'github_list_commits', desc: 'List recent git commits for branch or repository', params: { repo: z.string(), branch: z.string().optional() } },
    { name: 'github_create_issue', desc: 'Open a public bug report issue in GitHub repo', params: { repo: z.string(), title: z.string(), body: z.string() } },
    { name: 'github_close_pr', desc: 'Close abandoned or superseded pull request', params: { repo: z.string(), prNumber: z.number() } },
    { name: 'github_get_tree', desc: 'Fetch recursive git directory tree and file SHA hashes', params: { repo: z.string(), sha: z.string() } },
    { name: 'github_create_release', desc: 'Publish a tagged semantic version release', params: { repo: z.string(), tagName: z.string(), releaseNotes: z.string() } },
    { name: 'github_fork_repo', desc: 'Fork repository into user or organization namespace', params: { repo: z.string() } },
    { name: 'github_trigger_action', desc: 'Trigger GitHub Actions CI/CD workflow dispatch', params: { repo: z.string(), workflowId: z.string(), inputs: z.record(z.any()).optional() } },
  ];

  // 5. Collaboration / Slack Domain (10 tools)
  const slackToolSpecs = [
    { name: 'slack_post_message', desc: 'Send chat message to Slack channel or user DM', params: { channel: z.string(), text: z.string() } },
    { name: 'slack_create_channel', desc: 'Create a new public or private discussion channel', params: { name: z.string(), isPrivate: z.boolean().optional() } },
    { name: 'slack_upload_file', desc: 'Upload file, snippet, or document to channel', params: { channel: z.string(), fileUrl: z.string(), title: z.string() } },
    { name: 'slack_set_topic', desc: 'Change channel topic or purpose description', params: { channel: z.string(), topic: z.string() } },
    { name: 'slack_invite_user', desc: 'Invite user workspace member to channel', params: { channel: z.string(), userId: z.string() } },
    { name: 'slack_archive_channel', desc: 'Archive an inactive project discussion channel', params: { channel: z.string() } },
    { name: 'slack_list_channels', desc: 'List all public channels in workspace', params: { types: z.string().optional() } },
    { name: 'slack_add_reaction', desc: 'Add emoji reaction to posted chat message', params: { channel: z.string(), timestamp: z.string(), emoji: z.string() } },
    { name: 'slack_delete_message', desc: 'Delete an accidental or erroneous message', params: { channel: z.string(), timestamp: z.string() } },
    { name: 'slack_pin_message', desc: 'Pin important reference message in channel header', params: { channel: z.string(), timestamp: z.string() } },
  ];

  const allSpecs = [...dbToolSpecs, ...stripeToolSpecs, ...jiraToolSpecs, ...githubToolSpecs, ...slackToolSpecs];

  for (const spec of allSpecs) {
    tools.push(
      new Tool({
        name: spec.name,
        description: spec.desc,
        inputSchema: z.object(spec.params as z.ZodRawShape),
        handler: async (args: any) => ({ tool: spec.name, received: args }),
      })
    );
  }

  // Add 2 Essential Whitelist Tools
  tools.push(
    new Tool({
      name: 'auth_login',
      description: 'Log into system using Bearer token or credentials',
      inputSchema: z.object({ token: z.string() }),
      handler: async () => ({ status: 'authenticated' }),
    }),
    new Tool({
      name: 'system_health',
      description: 'Check infrastructure health and cluster telemetry',
      inputSchema: z.object({}),
      handler: async () => ({ status: 'ok', uptime: 3600 }),
    })
  );

  return tools;
}

describe('50+ Tool Synthetic Catalog Benchmark & Token Savings (NITRO-102-M4)', () => {
  it('generates 50+ enterprise tools and verifies catalog scale', () => {
    const tools = create50EnterpriseTools();
    expect(tools.length).toBe(52); // 50 enterprise + 2 auth/health
  });

  it('achieves >80% prompt volume reduction via progressive discovery', async () => {
    const allTools = create50EnterpriseTools();

    // 1. Baseline: serialize all 52 tools as MCP tools with full JSON Schemas
    const baselineMcpTools = await Promise.all(allTools.map((t) => t.toMcpTool()));
    const baselineJson = JSON.stringify(baselineMcpTools);
    const baselineBytes = Buffer.byteLength(baselineJson, 'utf-8');

    // 2. Progressive Discovery: BM25SearchTransform with 2 alwaysVisible tools
    const transform = new BM25SearchTransform({
      alwaysVisible: ['auth_login', 'system_health'],
    });

    const compressedTools = await transform.transformTools(allTools);
    const compressedMcpTools = await Promise.all(compressedTools.map((t) => t.toMcpTool()));
    const compressedJson = JSON.stringify(compressedMcpTools);
    const compressedBytes = Buffer.byteLength(compressedJson, 'utf-8');

    const reductionPercent = ((baselineBytes - compressedBytes) / baselineBytes) * 100;

    // Emits exactly 4 tools: search_tools, call_tool, auth_login, system_health
    expect(compressedTools.length).toBe(4);
    expect(compressedTools.map((t) => t.name)).toEqual([
      'search_tools',
      'call_tool',
      'auth_login',
      'system_health',
    ]);

    // Assert reduction is well over 80% (typically >88%)
    expect(reductionPercent).toBeGreaterThanOrEqual(80);
  });
});
