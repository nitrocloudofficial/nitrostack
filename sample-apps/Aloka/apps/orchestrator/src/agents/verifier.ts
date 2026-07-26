import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StateAnnotation } from '../graph/state.js';

// ─── MCP client helpers ───────────────────────────────────────────────────────

async function callK8sMcpTool(toolName: string, args: Record<string, unknown>): Promise<string> {
  const transport = new StdioClientTransport({
    command: 'node',
    args:    [process.env.K8S_MCP_PATH ?? 'packages/mcp-servers/k8s-test-mcp/dist/index.js'],
    env:     { ...process.env } as Record<string, string>,
  });
  const client = new Client({ name: 'orchestrator', version: '1.0.0' });
  await client.connect(transport);
  try {
    const result  = await client.callTool({ name: toolName, arguments: args });
    const content = result.content as Array<{ type: string; text?: string }>;
    return content.find(c => c.type === 'text')?.text ?? '';
  } finally {
    await client.close();
  }
}

async function callGitMcpTool(toolName: string, args: Record<string, unknown>): Promise<string> {
  const transport = new StdioClientTransport({
    command: 'node',
    args:    [process.env.GIT_MCP_PATH ?? 'packages/mcp-servers/git-mcp/dist/index.js'],
    env:     { ...process.env } as Record<string, string>,
  });
  const client = new Client({ name: 'orchestrator', version: '1.0.0' });
  await client.connect(transport);
  try {
    const result  = await client.callTool({ name: toolName, arguments: args });
    const content = result.content as Array<{ type: string; text?: string }>;
    return content.find(c => c.type === 'text')?.text ?? '';
  } finally {
    await client.close();
  }
}

async function callSlackMcpTool(toolName: string, args: Record<string, unknown>): Promise<string> {
  const transport = new StdioClientTransport({
    command: 'node',
    args:    [process.env.SLACK_MCP_PATH ?? 'packages/mcp-servers/slack-mcp/dist/index.js'],
    env:     { ...process.env } as Record<string, string>,
  });
  const client = new Client({ name: 'orchestrator', version: '1.0.0' });
  await client.connect(transport);
  try {
    const result  = await client.callTool({ name: toolName, arguments: args });
    const content = result.content as Array<{ type: string; text?: string }>;
    return content.find(c => c.type === 'text')?.text ?? '';
  } finally {
    await client.close();
  }
}

// ─── verifierAgent ────────────────────────────────────────────────────────────

export async function verifierAgent(state: typeof StateAnnotation.State) {
  const ctx = state.pipelineContext;
  console.log(`[Fix Verifier] Received approval on thread ${state.slackThreadId}. Running verification.`);

  const channelId = process.env.SLACK_CHANNEL_ID;
  const threadTs = state.slackThreadId;

  const notifySlack = async (text: string) => {
    if (channelId && threadTs && threadTs !== 'slack-thread-123') {
      try {
        await callSlackMcpTool('update_thread_message', {
          channel_id: channelId,
          thread_ts: threadTs,
          update_text: text
        });
      } catch (err: any) {
        console.warn(`[Fix Verifier] Slack update failed: ${err.message}`);
      }
    }
  };

  await notifySlack('⏱️ *Running Testkube verification...*');

  // 1. Run Testkube test suite with the patch diff as a variable
  let testkubeRunId: string | null = null;
  try {
    const suite    = process.env.TESTKUBE_SUITE ?? 'regression-suite';
    const ns       = process.env.TESTKUBE_NAMESPACE ?? 'default';
    const runResult = await callK8sMcpTool('run_ephemeral_test_suite', {
      suite_name: suite,
      patch_diff: state.patchDiff ?? '',
      target_namespace: ns,
    });
    console.log(`[Fix Verifier] Testkube: ${runResult}`);
    await notifySlack(`✅ *Testkube Verification Completed:* \n\`\`\`${runResult}\`\`\``);

    // Extract run ID from result string "[SUCCESS] Started test suite execution. Run ID: abc123"
    const idMatch = runResult.match(/Run ID:\s*(\S+)/);
    testkubeRunId = idMatch?.[1] ?? null;
  } catch (err: any) {
    console.warn(`[Fix Verifier] Testkube call failed: ${err.message}. Continuing to PR creation.`);
    await notifySlack(`⚠️ *Testkube Verification Failed:* ${err.message}`);
  }

  // 2. Create branch + PR via git-mcp if there is an actual diff and context
  let prUrl = '';
  const targetFile = state.suggestedFiles?.[0];
  const hasDiff    = state.patchDiff && !state.patchDiff.startsWith('[') && !state.patchDiff.startsWith('LLM');

  if (hasDiff && targetFile && ctx?.owner && ctx?.repo) {
    try {
      // Build the new file content from the diff, stripping any markdown backticks the LLM might have added
      let fixedContent = state.patchDiff ?? '';
      fixedContent = fixedContent.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '');
      const branchName   = `fix/ci-run-${ctx.run_id ?? Date.now()}-autofixed`;
      const prTitle      = `fix: auto-patch CI failure in run ${ctx.run_id ?? 'unknown'}`;
      const prBody       =
        `## Automated CI Fix\n\n` +
        `**Run ID:** ${ctx.run_id}\n` +
        `**Commit:** ${ctx.commit_sha}\n\n` +
        `### Root Cause Analysis\n${state.rcaSummary}\n\n` +
        `### CI Failure Context\n\`\`\`\n${(state.ciGraphContext ?? '').slice(0, 800)}\n\`\`\`\n\n` +
        `*This PR was generated automatically by OmniTrace. Review before merging.*`;

      console.log(`[Fix Verifier] Creating PR: ${branchName}`);
      prUrl = await callGitMcpTool('create_branch_and_pr', {
        repo_slug:    `${ctx.owner}/${ctx.repo}`,
        base_branch:  ctx.branch_name ?? 'main',
        new_branch:   branchName,
        file_changes: [{ path: targetFile, content: fixedContent }],
        pr_title:     prTitle,
        pr_body:      prBody,
      });
      console.log(`[Fix Verifier] PR created: ${prUrl}`);
      await notifySlack(`🎉 *PR Created Successfully!* <${prUrl}|Review and Merge PR>`);
    } catch (err: any) {
      console.warn(`[Fix Verifier] git-mcp PR creation failed: ${err.message}`);
      await notifySlack(`❌ *Failed to create PR:* ${err.message}`);
    }
  } else {
    console.log('[Fix Verifier] No valid patch diff to commit — skipping PR creation.');
    await notifySlack(`⚠️ *Skipped PR Creation:* No valid code patch was generated to commit.`);
  }

  return {
    status: 'COMPLETED' as const,
    ...(prUrl ? { slackThreadId: prUrl } : {}), // surface PR URL in final state
  };
}
