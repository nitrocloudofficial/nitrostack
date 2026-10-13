import { existsSync } from 'fs';

const checks = [
  // Server dependencies
  { label: '@nitrostack/core',              path: 'node_modules/@nitrostack/core' },
  { label: 'zod',                           path: 'node_modules/zod' },
  { label: 'dotenv',                        path: 'node_modules/dotenv' },
  { label: '@nitrostack/cli (dev)',          path: 'node_modules/@nitrostack/cli' },
  // Widget dependencies
  { label: 'next (widgets)',                path: 'src/widgets/node_modules/next' },
  { label: 'react (widgets)',               path: 'src/widgets/node_modules/react' },
  { label: '@nitrostack/widgets (widgets)', path: 'src/widgets/node_modules/@nitrostack/widgets' },
  { label: 'lucide-react (widgets)',        path: 'src/widgets/node_modules/lucide-react' },
  { label: 'mapbox-gl (widgets)',           path: 'src/widgets/node_modules/mapbox-gl' },
  { label: 'framer-motion (widgets)',       path: 'src/widgets/node_modules/framer-motion' },
  { label: 'tailwindcss (widgets)',         path: 'src/widgets/node_modules/tailwindcss' },
];

let allGood = true;
const missing = [];

for (const { label, path } of checks) {
  const ok = existsSync(path);
  console.log(`  ${ok ? '✅' : '❌'} ${label}`);
  if (!ok) { allGood = false; missing.push(label); }
}

console.log('');
if (allGood) {
  console.log('All dependencies installed.');
} else {
  console.log(`Missing: ${missing.join(', ')}`);
}
