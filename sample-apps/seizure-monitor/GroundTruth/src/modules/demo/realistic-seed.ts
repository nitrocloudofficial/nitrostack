import type { Employee } from '../../store/types.js';

/**
 * The "realistic" dataset: twelve people across two teams.
 *
 * Separate from the four-person demo set on purpose. Four people is the right
 * size for a three-minute recording — every row fits on screen and every person
 * is there to make one point. Twelve is the right size for someone poking at a
 * deployed instance, where a four-row digest looks like a fixture and search and
 * team Q&A have nothing to chew on.
 *
 * Everyone here is a case, not filler. The mix matters more than the count: if
 * most people are quiet, the ranking has to earn its place by floating the right
 * two to the top, and an agent that alerts on half the team is visibly wrong.
 */

export const REALISTIC_TEAM: Employee[] = [
  // ── team-platform ───────────────────────────────────────────────────────
  { id: 'emp-1', name: 'Aarav Menon', role: 'Backend Engineer', teamId: 'team-platform', githubUsername: 'Vimaladharsan' },
  { id: 'emp-2', name: 'Divya Raghavan', role: 'Frontend Engineer', teamId: 'team-platform', githubUsername: 'divya-raghavan-demo' },
  { id: 'emp-3', name: 'Karthik Iyer', role: 'Full-stack Engineer', teamId: 'team-platform', githubUsername: 'karthik-iyer-demo' },
  { id: 'emp-4', name: 'Meera Nair', role: 'QA Engineer', teamId: 'team-platform', githubUsername: 'meera-nair-demo' },
  { id: 'emp-5', name: 'Rohan Desai', role: 'DevOps Engineer', teamId: 'team-platform', githubUsername: 'rohan-desai-demo' },
  { id: 'emp-6', name: 'Sneha Pillai', role: 'Engineering Manager', teamId: 'team-platform', githubUsername: 'sneha-pillai-demo' },

  // ── team-mobile ─────────────────────────────────────────────────────────
  { id: 'emp-7', name: 'Vikram Shetty', role: 'Android Engineer', teamId: 'team-mobile', githubUsername: 'vikram-shetty-demo' },
  { id: 'emp-8', name: 'Ananya Bose', role: 'iOS Engineer', teamId: 'team-mobile', githubUsername: 'ananya-bose-demo' },
  { id: 'emp-9', name: 'Farhan Qureshi', role: 'Mobile QA', teamId: 'team-mobile', githubUsername: 'farhan-qureshi-demo' },
  { id: 'emp-10', name: 'Priya Varma', role: 'Product Designer', teamId: 'team-mobile', githubUsername: 'priya-varma-demo' },
  { id: 'emp-11', name: 'Joel Mathew', role: 'Junior Engineer', teamId: 'team-mobile', githubUsername: 'joel-mathew-demo' },
  { id: 'emp-12', name: 'Tara Krishnan', role: 'Data Engineer', teamId: 'team-mobile', githubUsername: 'tara-krishnan-demo' },
];

export interface SeededDay {
  text: string;
  confidence: number;
}

/**
 * Day scripts, index 0 = most recent. A person with fewer entries than the
 * window simply repeats their last one, so a short history still reads sensibly.
 * `null` means no report submitted that day, which is itself a signal.
 */
export const REALISTIC_SCRIPTS: Record<string, Array<SeededDay | null>> = {
  // Escalation: claims completion daily, one blocker that never moves.
  'emp-1': [
    { text: 'Finished the login module and wired up session handling. Still blocked on the staging database credentials, waiting on the infra team.', confidence: 2 },
    { text: 'Completed the token refresh flow. Still blocked on the staging DB credentials, no word from infra.', confidence: 2 },
    { text: 'Wrapped up the auth middleware. Blocked on the staging database credentials again.', confidence: 3 },
    { text: 'Auth middleware mostly done. Waiting on staging credentials from infra to test it properly.', confidence: 3 },
    { text: 'Started on the auth middleware, reading through the existing session code.', confidence: 4 },
    { text: 'Scoped out the auth work and wrote up the approach.', confidence: 4 },
    { text: 'Onboarding onto the auth epic, paired with Karthik on the data model.', confidence: 4 },
  ],

  // Healthy: says what she did, does what she said.
  'emp-2': [
    { text: 'Completed the digest dashboard widget and opened a PR for review.', confidence: 5 },
    { text: 'Shipped the severity chip component and merged the layout fixes.', confidence: 5 },
    { text: 'Built out the report form and pushed the first pass of the styling.', confidence: 4 },
    { text: 'Set up the widget scaffolding and got the dev server running.', confidence: 4 },
    { text: 'Reviewed the design system tokens with Priya and started the component list.', confidence: 4 },
    { text: 'Cleared the frontend backlog from last sprint.', confidence: 5 },
    { text: 'Planning session, then started sketching the dashboard layout.', confidence: 4 },
  ],

  // The false positive: real work, almost no commit trail. Must not alert.
  'emp-3': [
    { text: 'Spent most of today reviewing PRs and pairing with Divya on the widget layout.', confidence: 4 },
    { text: 'Wrote the design doc for the alerting flow, mostly discussion and diagrams today.', confidence: 4 },
    { text: 'Interviewing candidates for the backend role, plus a long architecture call.', confidence: 4 },
    { text: 'Reviewed the auth approach with Aarav and sketched the data model on the whiteboard.', confidence: 4 },
    { text: 'Incident review and a half day of interviews.', confidence: 4 },
    { text: 'Mentoring Joel on the mobile codebase, mostly pairing.', confidence: 4 },
    { text: 'Architecture review for the notifications rework.', confidence: 4 },
  ],

  // Burnout: no claim mismatch at all, but visibly wearing down.
  'emp-4': [
    { text: 'Regression suite is still failing intermittently and I am struggling to keep up with the queue. Feeling pretty exhausted.', confidence: 2 },
    { text: 'Wrote more test cases but the flaky suite is overwhelming, spent the day rerunning things.', confidence: 2 },
    { text: 'Worked through the regression backlog, slower than I wanted.', confidence: 3 },
    { text: 'Finished the smoke test checklist and filed three bugs.', confidence: 4 },
    { text: 'Triaged the incoming bug queue and closed six.', confidence: 4 },
    { text: 'Set up the new test fixtures.', confidence: 4 },
    { text: 'Regression planning for the release.', confidence: 4 },
  ],

  // Quietly effective, occasionally on call. One missed day is not a pattern.
  'emp-5': [
    { text: 'Rotated the deploy keys and cleaned up the staging pipeline.', confidence: 4 },
    null,
    { text: 'On call overnight, spent the day on the incident postmortem.', confidence: 3 },
    { text: 'Migrated the CI runners and cut build time roughly in half.', confidence: 5 },
    { text: 'Patched the base images and rolled them out.', confidence: 4 },
    { text: 'Terraform cleanup, removed a lot of dead infrastructure.', confidence: 4 },
    { text: 'Reviewed the deployment runbook with Sneha.', confidence: 4 },
  ],

  // A manager: almost no code, and that is entirely correct for the role.
  'emp-6': [
    { text: 'One-to-ones all morning, then roadmap planning with product.', confidence: 4 },
    { text: 'Hiring loop debrief and the quarterly planning doc.', confidence: 4 },
    { text: 'Budget review, plus unblocking the infra request for Aarav.', confidence: 3 },
    { text: 'Stakeholder sync on the mobile timeline.', confidence: 4 },
    { text: 'Performance review writeups.', confidence: 4 },
    { text: 'Team retro and follow-up actions.', confidence: 4 },
    { text: 'Interviewing, and reviewing the architecture proposal.', confidence: 4 },
  ],

  // A second, milder mismatch — enough to be worth noting, not escalating.
  'emp-7': [
    { text: 'Finished the offline sync for the Android client.', confidence: 4 },
    { text: 'Working through the sync conflict edge cases, nearly there.', confidence: 4 },
    { text: 'Started the offline sync work, mapped out the conflict strategy.', confidence: 4 },
    { text: 'Fixed the crash on the settings screen and shipped it.', confidence: 5 },
    { text: 'Bug triage and a few small fixes.', confidence: 4 },
    { text: 'Release prep for the Play Store build.', confidence: 4 },
    { text: 'Sprint planning and estimation.', confidence: 4 },
  ],

  // Consistently strong.
  'emp-8': [
    { text: 'Shipped the new onboarding flow to TestFlight.', confidence: 5 },
    { text: 'Finished the accessibility pass on the main screens.', confidence: 5 },
    { text: 'Rebuilt the settings screen with the new design tokens.', confidence: 5 },
    { text: 'Fixed the layout issues on smaller devices.', confidence: 4 },
    { text: 'Reviewed the design handoff with Priya.', confidence: 4 },
    { text: 'Refactored the networking layer.', confidence: 4 },
    { text: 'Sprint planning.', confidence: 4 },
  ],

  // A blocker on its second day — real, but not yet urgent.
  'emp-9': [
    { text: 'Device lab is still down so I cannot run the physical device suite. Blocked on IT for the replacement hub.', confidence: 3 },
    { text: 'Device lab hardware failed, blocked on IT to replace the USB hub.', confidence: 3 },
    { text: 'Ran the full regression on the simulator, filed two issues.', confidence: 4 },
    { text: 'Test plan for the offline sync feature.', confidence: 4 },
    { text: 'Exploratory testing on the beta build.', confidence: 4 },
    { text: 'Automated the smoke suite for iOS.', confidence: 4 },
    { text: 'Regression planning.', confidence: 4 },
  ],

  // Designer: no commits by nature. Another chance to get it wrong.
  'emp-10': [
    { text: 'Finished the empty states and handed the specs to Ananya.', confidence: 5 },
    { text: 'User testing sessions all day, five participants.', confidence: 4 },
    { text: 'Iterated on the onboarding flow after the feedback round.', confidence: 4 },
    { text: 'Design review with the mobile team, then updated the component library.', confidence: 4 },
    { text: 'Wireframes for the notification settings.', confidence: 4 },
    { text: 'Research synthesis from last week interviews.', confidence: 4 },
    { text: 'Kickoff workshop for the redesign.', confidence: 4 },
  ],

  // New joiner: low confidence, but improving. Not a burnout signal.
  'emp-11': [
    { text: 'Got my first PR merged today, the date formatting fix.', confidence: 4 },
    { text: 'Still finding my way around the codebase but made progress on the bug.', confidence: 3 },
    { text: 'Paired with Karthik most of the day, starting to understand the build.', confidence: 3 },
    { text: 'Environment setup took most of the day, finally running locally.', confidence: 2 },
    { text: 'Onboarding, reading docs and setting up access.', confidence: 2 },
    null,
    null,
  ],

  // Steady, with one genuinely missed day.
  'emp-12': [
    { text: 'Backfilled the events table and validated the counts.', confidence: 4 },
    { text: 'Fixed the nightly pipeline failure, was a schema change upstream.', confidence: 4 },
    null,
    { text: 'Built the retention dashboard queries.', confidence: 4 },
    { text: 'Data quality checks on the new ingestion path.', confidence: 4 },
    { text: 'Reviewed the warehouse cost report.', confidence: 4 },
    { text: 'Pipeline planning with Rohan.', confidence: 4 },
  ],
};

/**
 * The original four. Kept because a three-minute recording has room for four
 * rows, not twelve, and each of these four exists to make one distinct point.
 * Load with `seed_demo_data({ scale: 'demo' })`.
 */
export const DEMO_TEAM: Employee[] = REALISTIC_TEAM.slice(0, 4);
