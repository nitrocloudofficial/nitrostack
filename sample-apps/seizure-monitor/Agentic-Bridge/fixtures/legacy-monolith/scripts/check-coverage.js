const fs = require('fs');
const min = Number(process.argv[process.argv.indexOf('--min') + 1] || 78);
const summary = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
if (summary.total.lines.pct < min) { console.error('Coverage gate failed'); process.exit(1); }
