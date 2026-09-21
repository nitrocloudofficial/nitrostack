import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let env: Record<string, string> = {};
try {
  env = JSON.parse(readFileSync(join(root, '.env.json'), 'utf8'));
} catch {
  // no .env.json — fall back to process.env
}

const has = (key: string): string => process.env[key] ?? env[key] ?? '';

const slack = has('SLACK_BOT_TOKEN');
const imap = has('EMAIL_IMAP_HOST') && has('EMAIL_IMAP_USER');
const smtp = has('EMAIL_SMTP_HOST') && has('EMAIL_SMTP_USER');
const linear = has('LINEAR_API_KEY');
const anthropic = has('ANTHROPIC_API_KEY');
const openrouter = has('OPENROUTER_API_KEY');

const row: Array<[string, boolean]> = [
  ['Slack', slack],
  ['Email IMAP (evidence search)', imap],
  ['Email SMTP (nudges)', smtp],
  ['Linear', linear],
  ['LLM: Anthropic', anthropic],
  ['LLM: OpenRouter', openrouter],
];

for (const [name, on] of row) {
  console.log(`${on ? '[ON]' : '[off]'} ${name}`);
}

const anyReal = slack || imap || smtp || linear;
console.log('');
console.log(
  anyReal
    ? 'MODE: hybrid — some real providers configured; unconfigured ones use fixtures'
    : 'MODE: demo — no real providers configured; all Slack/email/Linear data is fixture-based'
);
