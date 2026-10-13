import { MfApiClient } from '../src/clients/mfapi.js';
import { FUND_CATEGORY_SCHEME_CODES } from '../src/modules/growth/growth.constants.js';

async function main() {
  const client = new MfApiClient();

  for (const [category, { schemeCode }] of Object.entries(FUND_CATEGORY_SCHEME_CODES)) {
    const latest = await client.getLatestNav(schemeCode);
    console.log(`${category.padEnd(8)} ${latest.schemeName} — NAV ${latest.nav} as of ${latest.date}`);
  }
}

main()
  .catch((err) => {
    console.error('mfapi.in verification failed:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    // @nitrostack/core's @Injectable decorator (applied to MfApiClient) registers
    // into a process-wide DI container built for a long-running server, which
    // keeps the event loop alive. Force exit once this one-off script is done.
    process.exit(process.exitCode ?? 0);
  });
