import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const outputDirectory = fileURLToPath(new URL('../src/data/', import.meta.url));

const sources = {
  iris: 'https://archive.ics.uci.edu/ml/machine-learning-databases/iris/iris.data',
  wine: 'https://archive.ics.uci.edu/ml/machine-learning-databases/wine/wine.data',
  autoMpg: 'https://archive.ics.uci.edu/ml/machine-learning-databases/auto-mpg/auto-mpg.data',
  titanic: 'https://gitlab.com/data/d/openml/40945/-/raw/master/dataset/tables/data.csv',
};

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to download ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function csvRow(values) {
  return values.map((value) => {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }).join(',');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(value);
      value = '';
    } else if (character === '\n') {
      row.push(value.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}

function clean(value) {
  return value === '?' ? '' : value;
}

function buildIris(text) {
  const rows = text.trim().split(/\r?\n/).filter(Boolean).map((line) => line.split(','));
  return [
    csvRow(['sepal_length_cm', 'sepal_width_cm', 'petal_length_cm', 'petal_width_cm', 'species']),
    ...rows.map(([sepalLength, sepalWidth, petalLength, petalWidth, species]) => csvRow([
      sepalLength, sepalWidth, petalLength, petalWidth, species.replace('Iris-', '').toLowerCase(),
    ])),
  ].join('\n') + '\n';
}

function buildWine(text) {
  const rows = text.trim().split(/\r?\n/).filter(Boolean).map((line) => line.split(','));
  const headers = [
    'cultivar', 'alcohol', 'malic_acid', 'ash', 'alcalinity_of_ash', 'magnesium', 'total_phenols',
    'flavanoids', 'nonflavanoid_phenols', 'proanthocyanins', 'color_intensity', 'hue',
    'od280_od315', 'proline',
  ];
  return [csvRow(headers), ...rows.map((row) => csvRow(row))].join('\n') + '\n';
}

function buildAutoMpg(text) {
  const origins = { 1: 'usa', 2: 'europe', 3: 'japan' };
  const rows = text.trim().split(/\r?\n/).filter(Boolean).map((line) => {
    const match = line.trim().match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+".*"$/);
    if (!match) throw new Error(`Unable to parse Auto MPG row: ${line}`);
    const [, mpg, cylinders, displacement, horsepower, weight, acceleration, modelYear, origin] = match;
    return [mpg, cylinders, displacement, clean(horsepower), weight, acceleration, modelYear, origins[origin] ?? origin];
  });
  return [
    csvRow(['mpg', 'cylinders', 'displacement', 'horsepower', 'weight', 'acceleration', 'model_year', 'origin']),
    ...rows.map(csvRow),
  ].join('\n') + '\n';
}

function buildTitanic(text) {
  const [headers, ...rows] = parseCsv(text);
  const column = Object.fromEntries(headers.map((header, index) => [header, index]));
  const classes = { 1: 'first', 2: 'second', 3: 'third' };
  const ports = { C: 'cherbourg', Q: 'queenstown', S: 'southampton' };
  return [
    csvRow(['survived', 'passenger_class', 'sex', 'age', 'siblings_spouses', 'parents_children', 'fare', 'embarkation_port']),
    ...rows.map((row) => csvRow([
      clean(row[column.survived]),
      classes[row[column.pclass]] ?? clean(row[column.pclass]),
      clean(row[column.sex]),
      clean(row[column.age]),
      clean(row[column.sibsp]),
      clean(row[column.parch]),
      clean(row[column.fare]),
      ports[row[column.embarked]] ?? clean(row[column.embarked]),
    ])),
  ].join('\n') + '\n';
}

await mkdir(outputDirectory, { recursive: true });
const [iris, wine, autoMpg, titanic] = await Promise.all([
  download(sources.iris),
  download(sources.wine),
  download(sources.autoMpg),
  download(sources.titanic),
]);

await Promise.all([
  writeFile(new URL('iris.csv', `file://${outputDirectory}`), buildIris(iris)),
  writeFile(new URL('wine.csv', `file://${outputDirectory}`), buildWine(wine)),
  writeFile(new URL('auto-mpg.csv', `file://${outputDirectory}`), buildAutoMpg(autoMpg)),
  writeFile(new URL('titanic.csv', `file://${outputDirectory}`), buildTitanic(titanic)),
]);

console.log('Classic dataset snapshots written to src/data/.');
