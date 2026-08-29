import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import {
  biologicalConstraintProfileSchema,
  profileMetadataSchema,
  rankingProfileSchema,
} from './validation.js';

export const DEFAULT_PROFILE_DIRECTORY = fileURLToPath(
  new URL('../../../data/profiles/', import.meta.url),
);

const profileDefinitions = {
  biologicalConstraints: {
    baseName: 'biological-constraints',
    schema: biologicalConstraintProfileSchema,
  },
  ranking: { baseName: 'ranking', schema: rankingProfileSchema },
} as const;

const profileVersionSchema = z.string().regex(/^[a-z0-9][a-z0-9.-]{0,99}$/i);

export type ProfileKey = keyof typeof profileDefinitions;

export interface LoadedProfile<T> {
  definition: T;
  metadata: z.infer<typeof profileMetadataSchema>;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Profile numbers must be finite');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`;
  }
  throw new Error('Profile contains a non-JSON value');
}

export function computeProfileHash(definition: unknown): string {
  return createHash('sha256').update(canonicalJson(definition)).digest('hex');
}

export async function loadProfile(
  key: ProfileKey,
  directory = DEFAULT_PROFILE_DIRECTORY,
): Promise<LoadedProfile<unknown>> {
  return loadProfileVersion(key, 'mvp-v1.0', directory);
}

export async function loadProfileVersion(
  key: ProfileKey,
  version: string,
  directory = DEFAULT_PROFILE_DIRECTORY,
): Promise<LoadedProfile<unknown>> {
  const safeVersion = profileVersionSchema.parse(version);
  const descriptor = profileDefinitions[key];
  const contents = await readFile(join(directory, `${descriptor.baseName}.${safeVersion}.json`));
  const document: unknown = JSON.parse(contents.toString('utf8'));
  const definition = descriptor.schema.parse(document);
  const metadata = profileMetadataSchema.parse({
    name: definition.name,
    version: definition.version,
    hash: computeProfileHash(definition),
  });
  return { definition, metadata };
}

export async function loadDefaultProfileSnapshot(directory = DEFAULT_PROFILE_DIRECTORY) {
  const [biologicalConstraints, ranking] = await Promise.all([
    loadProfile('biologicalConstraints', directory),
    loadProfile('ranking', directory),
  ]);
  return {
    biologicalConstraints: biologicalConstraints.metadata,
    ranking: ranking.metadata,
  } as const;
}
