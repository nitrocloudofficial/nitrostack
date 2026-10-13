import 'reflect-metadata';
import { seed, DEMO_TXN_ID } from './seed.js';

export { DEMO_TXN_ID };

// Same seeding logic as seed.ts (which itself already reads DB_PATH from env,
// falling back to ./data/journal.db for local dev). The production variant's
// only difference: it refuses to run without an explicit DB_PATH, so a
// missing NitroCloud persistent-volume mount fails loudly instead of quietly
// seeding into an ephemeral container path that vanishes on next scale-to-zero.
if (!process.env.DB_PATH) {
  console.error('DB_PATH is not set — refusing to seed. Expected the NitroCloud persistent volume path, e.g. /data/journal.db.');
  process.exit(1);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
