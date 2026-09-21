// Standalone script: `npm run seed:reset` — wipes stored data and
// re-seeds the two demo cases. Useful when a demo has drifted after a
// lot of manual testing and you want a clean slate again.

import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, UPLOADS_DIR } from '../config';

for (const file of ['cases.json', 'documents.json', 'issues.json']) {
  const filePath = path.join(DATA_DIR, file);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

if (fs.existsSync(UPLOADS_DIR)) {
  for (const entry of fs.readdirSync(UPLOADS_DIR)) {
    if (entry === '.gitkeep') continue;
    fs.rmSync(path.join(UPLOADS_DIR, entry), { recursive: true, force: true });
  }
}

// Deliberately required (not imported) so the store singleton is only
// constructed — and reads its JSON files — after the wipe above.
const { runSeed } = require('./seed') as typeof import('./seed');
runSeed();

console.log('Data reset and reseeded with clean-case and gotcha-case.');
