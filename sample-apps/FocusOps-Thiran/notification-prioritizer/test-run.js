import { GmailTools } from './dist/modules/gmail/gmail.tools.js';
import { SlackTools } from './dist/modules/slack/slack.tools.js';
import { JiraTools } from './dist/modules/jira/jira.tools.js';
import { CalendarTools } from './dist/modules/calendar/calendar.tools.js';
import { GithubTools } from './dist/modules/github/github.tools.js';
import { ContextTools } from './dist/modules/context/context.tools.js';
import { PrioritizerTools } from './dist/modules/prioritizer/prioritizer.tools.js';

// Mock ExecutionContext for testing
const mockCtx = {
  logger: {
    info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
    error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta || ''),
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || '')
  }
};

async function runTest() {
  console.log('=== STARTING NOTIFICATION PRIORITIZER TEST ===\n');

  // 1. Fetch from all sources
  console.log('Fetching notifications from all modules...');
  
  const gmailTools = new GmailTools();
  const slackTools = new SlackTools();
  const jiraTools = new JiraTools();
  const calendarTools = new CalendarTools();
  const githubTools = new GithubTools();
  const contextTools = new ContextTools();
  const prioritizerTools = new PrioritizerTools();

  const gmailRes = await gmailTools.fetchGmailNotifications({}, mockCtx);
  const slackRes = await slackTools.fetchSlackNotifications({}, mockCtx);
  const jiraRes = await jiraTools.fetchJiraNotifications({}, mockCtx);
  const calendarRes = await calendarTools.fetchCalendarEvents({}, mockCtx);
  const githubRes = await githubTools.fetchGithubNotifications({}, mockCtx);

  const merged = [
    ...gmailRes.notifications,
    ...slackRes.notifications,
    ...jiraRes.notifications,
    ...calendarRes.notifications,
    ...githubRes.notifications
  ];

  console.log(`\nTotal Merged Notifications: ${merged.length}`);

  // 2. Build User Context
  console.log('\nBuilding User Context...');
  const contextRes = await contextTools.buildUserContext({}, mockCtx);
  console.log('Context generated:', JSON.stringify(contextRes, null, 2));

  // 3. Prioritize Notifications
  console.log('\nRunning Prioritization Engine...');
  const priorityRes = await prioritizerTools.prioritizeNotifications({
    notifications: merged,
    context: contextRes
  }, mockCtx);

  const prioritized = priorityRes.prioritized;

  // 4. Print Triaged Output
  console.log('\n=== TRIAGE RESULTS ===');
  
  const urgent = prioritized.filter(item => item.tier === 'urgent_now');
  const normal = prioritized.filter(item => item.tier === 'normal');
  const fyi = prioritized.filter(item => item.tier === 'fyi_only');

  console.log(`\n🔴 URGENT NOW [${urgent.length}]:`);
  urgent.forEach(item => {
    console.log(`- [${item.source.toUpperCase()}] ${item.sender}: ${item.title}`);
    console.log(`  Reason: ${item.reason}`);
    console.log(`  AccountId: ${item.accountId} | AccountEmail: ${item.accountEmail}`);
  });

  console.log(`\n🟡 NORMAL [${normal.length}]:`);
  normal.forEach(item => {
    console.log(`- [${item.source.toUpperCase()}] ${item.sender}: ${item.title}`);
    console.log(`  Reason: ${item.reason}`);
    console.log(`  AccountId: ${item.accountId} | AccountEmail: ${item.accountEmail}`);
  });

  console.log(`\n🟢 FYI ONLY [${fyi.length}]:`);
  fyi.forEach(item => {
    console.log(`- [${item.source.toUpperCase()}] ${item.sender}: ${item.title}`);
    console.log(`  Reason: ${item.reason}`);
    console.log(`  AccountId: ${item.accountId} | AccountEmail: ${item.accountEmail}`);
  });

  // Verify critical requirement: accountId and accountEmail must pass through unchanged
  console.log('\nVerifying critical constraint (accountId/accountEmail integrity)...');
  let integrityPassed = true;
  for (const item of prioritized) {
    const original = merged.find(o => o.id === item.id);
    if (!original) {
      console.log(`❌ Error: Could not find original notification for ID ${item.id}`);
      integrityPassed = false;
      continue;
    }
    if (original.accountId !== item.accountId || original.accountEmail !== item.accountEmail) {
      console.log(`❌ Error: Account mismatch for ID ${item.id}`);
      console.log(`   Original: ${original.accountId} / ${original.accountEmail}`);
      console.log(`   Output:   ${item.accountId} / ${item.accountEmail}`);
      integrityPassed = false;
    }
  }

  if (integrityPassed) {
    console.log('✅ Integrity check PASSED: accountId and accountEmail are preserved perfectly!');
  } else {
    console.log('❌ Integrity check FAILED!');
  }

  console.log('\n=== TEST COMPLETE ===');
}

runTest().catch(err => {
  console.error('Test run failed with error:', err);
});
