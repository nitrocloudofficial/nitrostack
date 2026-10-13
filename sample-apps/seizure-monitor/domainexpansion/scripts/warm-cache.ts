/**
 * Pre-fetches the APIs.guru data the demo depends on, so the venue's wifi
 * failing mid-demo doesn't matter. Run once, commit fixtures/cache/.
 */

import { listProviders, fetchSpec } from '../src/integrations/apisguru.js';

const DEMO_PROVIDERS = ['stripe.com', 'slack.com', 'twilio.com'];

async function main(): Promise<void> {
  console.log('Warming APIs.guru cache...\n');

  const providers = await listProviders();
  console.log(`providers.json -> ${providers.data.length} providers (fromCache=${providers.fromCache}, degraded=${providers.degraded})`);
  if (providers.degraded) {
    console.error('Failed to warm providers.json — check network access.');
    process.exitCode = 1;
  }

  for (const provider of DEMO_PROVIDERS) {
    const spec = await fetchSpec(provider);
    const pathCount = spec.degraded || typeof spec.data !== 'object' || spec.data === null
      ? 'n/a'
      : Object.keys((spec.data as { paths?: Record<string, unknown> }).paths ?? {}).length;
    console.log(`${provider} -> degraded=${spec.degraded} fromCache=${spec.fromCache} paths=${pathCount}`);
    if (spec.degraded) {
      console.error(`Failed to warm spec for ${provider} — check network access.`);
      process.exitCode = 1;
    }
  }

  console.log('\nDone.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
