import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * Synthetic attrition data for classification.
 *
 * The point of this dataset is that it must NOT be separable. Labels are drawn
 * from a probability, not a rule, so the feature ranges of leavers and stayers
 * overlap heavily and a share of rows contradict the trend outright. A model
 * fitted here should land in the seventies, which is a credible result — a
 * near-perfect score on synthetic data reads as fabricated.
 */

let state = 0x5eed4321;

function random() {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 2 ** 32;
}

function choose(values) {
  return values[Math.floor(random() * values.length)];
}

/** Box–Muller, so the numeric features have tails rather than hard edges. */
function normal() {
  const u = Math.max(random(), 1e-9);
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

const departments = ['engineering', 'product', 'sales', 'support', 'operations'];
const arrangements = ['remote', 'hybrid', 'office'];

// Deliberately small next to the noise term: a department nudges the odds, it
// never decides the outcome on its own.
const departmentEffect = {
  engineering: -0.30,
  product: -0.10,
  sales: 0.38,
  support: 0.30,
  operations: 0.02,
};
const arrangementEffect = { remote: -0.22, hybrid: -0.04, office: 0.20 };

const ROW_COUNT = 420;
/** Rows whose label is flipped against the trend, so the data self-contradicts. */
const CONTRADICTION_RATE = 0.04;

const header = [
  'tenure_years',
  'monthly_hours',
  'performance_rating',
  'department',
  'work_arrangement',
  'attrition',
];

const rows = [header];
let leaveCount = 0;

for (let index = 0; index < ROW_COUNT; index += 1) {
  const tenureYears = Math.round(clamp(Math.abs(normal()) * 3.4, 0, 14));
  const monthlyHours = Math.round(clamp(190 + normal() * 23, 138, 268));
  const performanceRating = Math.round(clamp(3.4 + normal() * 0.95, 1, 5));
  const department = choose(departments);
  const arrangement = choose(arrangements);

  // A latent score, not a threshold rule. The noise term is large relative to
  // every coefficient, which is what forces the ranges to overlap.
  const latent =
    -0.45
    + 0.055 * (monthlyHours - 190)
    - 0.24 * tenureYears
    - 0.50 * (performanceRating - 3)
    + departmentEffect[department]
    + arrangementEffect[arrangement]
    + normal() * 0.85;

  let attrition = random() < sigmoid(latent) ? 'leave' : 'stay';
  if (random() < CONTRADICTION_RATE) {
    attrition = attrition === 'leave' ? 'stay' : 'leave';
  }
  if (attrition === 'leave') leaveCount += 1;

  // Gaps in the inputs only. Every row keeps its outcome so the usable-row
  // count stays predictable.
  rows.push([
    random() < 0.02 ? '' : tenureYears,
    random() < 0.04 ? '' : monthlyHours,
    random() < 0.05 ? '' : performanceRating,
    random() < 0.04 ? '' : department,
    random() < 0.03 ? '' : arrangement,
    attrition,
  ]);
}

const outputPath = fileURLToPath(new URL('../src/data/employee-attrition.csv', import.meta.url));
await mkdir(fileURLToPath(new URL('../src/data/', import.meta.url)), { recursive: true });
await writeFile(outputPath, `${rows.map((row) => row.join(',')).join('\n')}\n`, 'utf8');

const leaveShare = ((leaveCount / ROW_COUNT) * 100).toFixed(1);
console.log(`Wrote ${ROW_COUNT} rows to ${outputPath}`);
console.log(`Class balance: leave ${leaveCount} (${leaveShare}%), stay ${ROW_COUNT - leaveCount}`);
