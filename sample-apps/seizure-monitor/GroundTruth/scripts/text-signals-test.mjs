/**
 * Unit test for the deterministic text signals.
 *
 * These were matched with `includes()`, which compares substrings and so
 * inverted meaning on the words that matter most. "unresolved" contains
 * "resolved", so an unfinished bug was read as completed work. "unblocked"
 * contains "blocked", so a cleared blocker still counted towards the
 * recurring-blocker run — the signal that decides whether a manager gets woken
 * up. Both produce a confident wrong answer rather than a visible failure,
 * which is the class of bug this project can least afford.
 *
 * Whole-word matching fixes the entire un-/in- prefix family at once, because
 * there is no word boundary between a prefix and its stem. A short negation
 * window then covers "not done" and "no longer blocked".
 *
 * Run `npm run build` first, then `npm run test:text`.
 */
import { looksLikeBlocker, assertsCompletion, scoreSentiment } from '../dist/lib/text.js';

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

// --- The prefix family: a negated stem must not read as the stem ---
for (const [text, label] of [
  ['Finally unblocked on the staging credentials', 'unblocked is not blocked'],
  ['Got unstuck this morning', 'unstuck is not stuck'],
]) {
  check(label, looksLikeBlocker(text) === false, `looksLikeBlocker=${looksLikeBlocker(text)}`);
}

for (const [text, label] of [
  ['The login module is incomplete', 'incomplete is not complete'],
  ['Left the migration undone', 'undone is not done'],
  ['The auth bug is still unresolved', 'unresolved is not resolved'],
  ['That ticket is unfixed', 'unfixed is not fixed'],
]) {
  check(label, assertsCompletion(text) === false, `assertsCompletion=${assertsCompletion(text)}`);
}

// --- Explicit negation within a short window ---
check('"not done" does not assert completion',
  assertsCompletion('Not done with the login module') === false);
check('"no longer blocked" is not a blocker',
  looksLikeBlocker('No longer blocked on credentials') === false);
check('"never got unblocked" is not a blocker',
  looksLikeBlocker('Never got unblocked') === false);

// The window is deliberately narrow: a negation earlier in the sentence must
// not swallow an unrelated claim later in it.
check('a negation two clauses back does not cancel a real claim',
  assertsCompletion('I was not sure, but finished the login module') === true);

// --- The real signals must still fire ---
check('a plain completion claim still registers',
  assertsCompletion('Finished the login module') === true);
check('a plain blocker still registers',
  looksLikeBlocker('Blocked on the staging database credentials') === true);
check('plurals still match', looksLikeBlocker('Hit two blockers today') === true);
check('"issues" still matches', looksLikeBlocker('Ran into issues with the API') === true);
check('multi-word blockers still match', looksLikeBlocker('Cannot access staging') === true);
check('"waiting" still matches', looksLikeBlocker('Waiting on the infra team') === true);

// --- Sentiment must not be inverted by the same substring trap ---
check('unblocked reads positive, not negative',
  scoreSentiment('Finally unblocked and shipped the fix') === 'positive',
  scoreSentiment('Finally unblocked and shipped the fix'));
check('an unresolved bug does not read as positive',
  scoreSentiment('The auth bug is still unresolved') !== 'positive',
  scoreSentiment('The auth bug is still unresolved'));
check('a genuinely bad day still reads negative',
  scoreSentiment('Stuck and frustrated, blocked all day') === 'negative',
  scoreSentiment('Stuck and frustrated, blocked all day'));

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
