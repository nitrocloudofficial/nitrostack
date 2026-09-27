export function parseCsv(content: string): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (!lines.length) {
    return rows;
  }

  const headers = splitCsvLine(lines[0]);

  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    if (!values.length || values.every((value) => value === '')) {
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    rows.push(row);
  }

  return rows;
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === ',' && !insideQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

export function normalizeValue(value: string): number | string | null {
  const trimmed = String(value).trim();
  if (trimmed === '') {
    return null;
  }

  const numberValue = Number(trimmed.replace(/,/g, '.'));
  if (!Number.isNaN(numberValue)) {
    return numberValue;
  }

  return trimmed;
}
