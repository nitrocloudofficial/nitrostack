import { Injectable } from '@nitrostack/core';
import type { RuntimeAttestation, RuntimeId } from './compute.types.js';

/**
 * Resolves a runtime to an immutable image digest through the OCI Distribution
 * API that Docker Hub implements (registry-1.docker.io).
 *
 * This is load-bearing, not decoration. A tag is mutable: `node:20-alpine` can
 * point at a different image tomorrow than it did when the offer was made. The
 * offer therefore pins the digest that was live at negotiation time, and
 * `accept_offer` materializes that exact digest. An agent can compare the digest
 * in its offer against the digest in its environment and prove it received what
 * policy actually promised.
 */

const AUTH_ENDPOINT = 'https://auth.docker.io/token';
const REGISTRY_ENDPOINT = 'https://registry-1.docker.io';
const REQUEST_TIMEOUT_MS = 6_000;
const CACHE_TTL_MS = 10 * 60 * 1000;

const MANIFEST_ACCEPT = [
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
  'application/vnd.docker.distribution.manifest.v2+json',
].join(', ');

interface ImageCoordinates {
  repository: string;
  tag: string;
}

/** Official images live under the implicit `library/` namespace. */
const RUNTIME_IMAGES: Record<RuntimeId, ImageCoordinates> = {
  node20: { repository: 'library/node', tag: '20-alpine' },
  node22: { repository: 'library/node', tag: '22-alpine' },
  python312: { repository: 'library/python', tag: '3.12-alpine' },
  python313: { repository: 'library/python', tag: '3.13-alpine' },
};

interface CacheEntry {
  digest: string;
  resolvedAt: number;
}

export function imageReference(runtime: RuntimeId): string {
  const image = RUNTIME_IMAGES[runtime];
  return `${image.repository.replace(/^library\//, '')}:${image.tag}`;
}

@Injectable()
export class RuntimeRegistryService {
  private readonly cache = new Map<RuntimeId, CacheEntry>();

  /**
   * Never throws. A registry outage must degrade the attestation, not block
   * negotiation — the agent is told the digest is unavailable and why.
   */
  async attest(runtime: RuntimeId, now = Date.now()): Promise<RuntimeAttestation> {
    const reference = imageReference(runtime);
    const base = {
      backend: 'docker' as const,
      reference,
      resolvedAt: new Date(now).toISOString(),
    };

    const cached = this.cache.get(runtime);
    if (cached && now - cached.resolvedAt < CACHE_TTL_MS) {
      return { ...base, digest: cached.digest, source: 'cache' };
    }

    try {
      const digest = await this.fetchDigest(RUNTIME_IMAGES[runtime]);
      this.cache.set(runtime, { digest, resolvedAt: now });
      return { ...base, digest, source: 'registry' };
    } catch (error) {
      // A stale digest still pins something real, so prefer it over nothing.
      if (cached) {
        return {
          ...base,
          digest: cached.digest,
          source: 'cache',
          note: 'Registry unreachable; reusing the last resolved digest.',
        };
      }
      return {
        ...base,
        digest: null,
        source: 'unavailable',
        note: `Registry lookup failed: ${errorText(error)}`,
      };
    }
  }

  private async fetchDigest(image: ImageCoordinates): Promise<string> {
    const token = await this.pullToken(image.repository);
    const response = await request(
      `${REGISTRY_ENDPOINT}/v2/${image.repository}/manifests/${image.tag}`,
      {
        method: 'HEAD',
        headers: { authorization: `Bearer ${token}`, accept: MANIFEST_ACCEPT },
      },
    );

    if (!response.ok) {
      throw new Error(`manifest request returned ${response.status}`);
    }

    const digest = response.headers.get('docker-content-digest');
    if (!digest?.startsWith('sha256:')) {
      throw new Error('registry returned no content digest');
    }
    return digest;
  }

  private async pullToken(repository: string): Promise<string> {
    const url = new URL(AUTH_ENDPOINT);
    url.searchParams.set('service', 'registry.docker.io');
    url.searchParams.set('scope', `repository:${repository}:pull`);

    const response = await request(url.toString(), { method: 'GET' });
    if (!response.ok) {
      throw new Error(`token request returned ${response.status}`);
    }

    const body = (await response.json()) as { token?: string };
    if (!body.token) {
      throw new Error('token response contained no token');
    }
    return body.token;
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function request(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
