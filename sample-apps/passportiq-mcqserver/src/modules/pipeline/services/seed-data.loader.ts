/**
 * Locates and parses src/data/seed-applications.json.
 *
 * WHY NOT `import seed from '../../data/seed-applications.json'`
 * -------------------------------------------------------------
 * `resolveJsonModule` makes that compile, but tsc does not COPY .json files into
 * dist/. The import survives type-checking and then throws ERR_MODULE_NOT_FOUND
 * the first time anyone runs the built server — which would be discovered during
 * the Hour 10 dry-run, not now. Reading from disk with a candidate list keeps dev
 * (tsx / nitrostack-cli dev), the built output, and the test runner all working
 * off the same single file.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SeedDatasetSchema, type SeedDataset } from '../../../contracts/index.js';

const SEED_FILENAME = 'seed-applications.json';

function candidatePaths(): string[] {
  const here = dirname(fileURLToPath(import.meta.url));
  return [
    // src/modules/pipeline/services -> src/data   (tsx / dev)
    resolve(here, '..', '..', '..', 'data', SEED_FILENAME),
    // dist/modules/pipeline/services -> src/data  (built server, json not copied)
    resolve(here, '..', '..', '..', '..', 'src', 'data', SEED_FILENAME),
    // explicit cwd fallbacks
    resolve(process.cwd(), 'src', 'data', SEED_FILENAME),
    resolve(process.cwd(), 'dist', 'data', SEED_FILENAME),
  ];
}

/**
 * Read + validate the dataset.
 *
 * Validation is not optional here: a malformed seed file must fail at BOOT with
 * a readable Zod error, not produce an empty applicant pool that silently makes
 * the fraud-ring reveal find nothing on stage.
 */
export function loadSeedDataset(): SeedDataset {
  const attempted: string[] = [];

  for (const path of candidatePaths()) {
    attempted.push(path);
    let raw: string;
    try {
      raw = readFileSync(path, 'utf8');
    } catch {
      continue; // not at this location — try the next candidate
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(
        `Seed dataset at ${path} is not valid JSON: ${(error as Error).message}`
      );
    }

    const result = SeedDatasetSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(
        `Seed dataset at ${path} does not match SeedDatasetSchema:\n` +
          JSON.stringify(result.error.format(), null, 2)
      );
    }

    return result.data;
  }

  throw new Error(
    `Could not locate ${SEED_FILENAME}. Looked in:\n  ${attempted.join('\n  ')}`
  );
}
