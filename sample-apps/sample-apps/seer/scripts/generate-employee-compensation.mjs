import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

let state = 0x5eed1234;

function random() {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 2 ** 32;
}

function choose(values) {
  return values[Math.floor(random() * values.length)];
}

const departments = ['engineering', 'product', 'sales', 'operations', 'finance'];
const educationLevels = ['high_school', 'bachelor', 'master', 'phd'];
const locations = ['bengaluru', 'mumbai', 'delhi', 'pune', 'hyderabad'];
const workModes = ['remote', 'hybrid', 'onsite'];
const departmentPremium = {
  engineering: 25000,
  product: 19000,
  sales: 14000,
  operations: 8000,
  finance: 12000,
};
const educationPremium = {
  high_school: 0,
  bachelor: 8000,
  master: 17000,
  phd: 28000,
};
const locationPremium = {
  bengaluru: 14000,
  mumbai: 16000,
  delhi: 12000,
  pune: 9000,
  hyderabad: 10000,
};

const rows = [[
  'employee_id',
  'years_experience',
  'education_level',
  'department',
  'location',
  'performance_rating',
  'certifications',
  'remote_status',
  'annual_salary',
]];

for (let index = 1; index <= 1500; index += 1) {
  const yearsExperience = Math.floor(random() * 25);
  const educationLevel = choose(educationLevels);
  const department = choose(departments);
  const location = choose(locations);
  const performanceRating = 1 + Math.floor(random() * 5);
  const certifications = Math.floor(random() * 5);
  const remoteStatus = choose(workModes);
  const salary = Math.round(
    42000
      + yearsExperience * 3100
      + educationPremium[educationLevel]
      + departmentPremium[department]
      + locationPremium[location]
      + performanceRating * 2200
      + certifications * 1800
      + (remoteStatus === 'remote' ? 2500 : remoteStatus === 'hybrid' ? 1200 : 0)
      + (random() - 0.5) * 10000,
  );

  rows.push([
    `EMP${String(index).padStart(4, '0')}`,
    yearsExperience,
    random() < 0.03 ? '' : educationLevel,
    random() < 0.03 ? '' : department,
    location,
    random() < 0.03 ? '' : performanceRating,
    certifications,
    remoteStatus,
    salary,
  ]);
}

const outputPath = fileURLToPath(new URL('../src/data/employee-compensation.csv', import.meta.url));
await mkdir(fileURLToPath(new URL('../src/data/', import.meta.url)), { recursive: true });
await writeFile(outputPath, `${rows.map((row) => row.join(',')).join('\n')}\n`, 'utf8');
