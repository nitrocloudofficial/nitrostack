// Dev-only visual QA helper: screenshot a console route, optionally cropped and
// scaled up, and report any console/page errors.
//
//   node scripts/dev-shot.mjs <url> <out.png> [--clip x,y,w,h] [--scale n] [--vp WxH] [--wait ms] [--full]
//
// The console holds an open SSE stream, so `networkidle` never fires. We wait on
// DOM content + an explicit settle delay instead.
//
// Not part of the build or the shipped app.
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const [url, out] = args;
if (!url || !out) {
  console.error('usage: node scripts/dev-shot.mjs <url> <out.png> [--clip x,y,w,h] [--scale n] [--vp WxH] [--wait ms] [--full]');
  process.exit(1);
}

const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const has = (name) => args.includes(name);

const scale = Number(flag('--scale') ?? 1);
const settle = Number(flag('--wait') ?? 3500);
const [vw, vh] = (flag('--vp') ?? '1680x1050').split('x').map(Number);
const clipRaw = flag('--clip');
const clip = clipRaw
  ? (([x, y, width, height]) => ({ x, y, width, height }))(clipRaw.split(',').map(Number))
  : undefined;

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({
  viewport: { width: vw, height: vh },
  deviceScaleFactor: scale,
});

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) => {
  console.error('nav:', e.message);
});
await page.waitForTimeout(settle);

await page.screenshot({ path: out, clip, fullPage: has('--full') && !clip });
console.log('shot:', out);
console.log('errors:', JSON.stringify(errors, null, 2));
await browser.close();
