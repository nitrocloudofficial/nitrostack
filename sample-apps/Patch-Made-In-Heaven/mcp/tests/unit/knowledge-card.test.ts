import { describe, expect, it } from 'vitest';
import {
  knowledgeCardSchema,
  isTrustedForIndexing,
  type KnowledgeCard,
} from '../../src/domain/knowledge-card.js';

function basePassCard(overrides: Partial<KnowledgeCard> = {}): unknown {
  return {
    id: 'fix_pydantic_v2_import',
    problem: "ImportError: cannot import name 'BaseSettings' from 'pydantic'",
    errorType: 'ImportError',
    stacktrace: "File 'main.py', line 2, in <module>\n  from pydantic import BaseSettings",
    environment: {
      language: 'python',
      version: '3.11.4',
      framework: 'fastapi',
      packageVersions: { pydantic: '2.4.2' },
    },
    patch: '--- a/main.py\n+++ b/main.py\n@@ -2 +2 @@\n-from pydantic import BaseSettings\n+from pydantic_settings import BaseSettings',
    verification: {
      status: 'PASS',
      score: 0.99,
      lastVerified: '2026-07-25T14:00:00.000Z',
      sandbox: 'docker',
      exitCode: 0,
      durationMs: 420,
      stdout: 'OK\n',
      stderr: '',
    },
    metrics: { reuseCount: 245 },
    provenance: {
      source: 'seed',
      category: 'python',
      addedAt: '2026-07-25T14:00:00.000Z',
    },
    ...overrides,
  };
}

describe('knowledgeCardSchema', () => {
  it('accepts a representative Python card', () => {
    const result = knowledgeCardSchema.safeParse(basePassCard());
    expect(result.success).toBe(true);
  });

  it('accepts a representative Node.js card', () => {
    const card = basePassCard({
      id: 'fix_esm_require',
      problem: 'ReferenceError: require is not defined in ES module scope',
      errorType: 'ReferenceError',
      environment: { language: 'javascript', version: '20.9.0', framework: 'express' },
      patch: "--- a/index.js\n+++ b/index.js\n@@ -1 +1,2 @@\n-const express = require('express');\n+import express from 'express';",
      provenance: { source: 'seed', category: 'node', addedAt: '2026-07-25T13:30:00.000Z' },
    });
    expect(knowledgeCardSchema.safeParse(card).success).toBe(true);
  });

  it('accepts a representative Docker card', () => {
    const card = basePassCard({
      id: 'fix_docker_permission_denied',
      problem: 'Permission denied: unable to bind port 80 in container',
      errorType: 'DockerError',
      environment: { language: 'docker', version: '24.0.5' },
      patch: '--- a/docker-compose.yml\n+++ b/docker-compose.yml\n@@ -5 +5 @@\n-      - "80:80"\n+      - "8080:80"',
      provenance: { source: 'seed', category: 'docker', addedAt: '2026-07-25T12:00:00.000Z' },
    });
    expect(knowledgeCardSchema.safeParse(card).success).toBe(true);
  });

  it('accepts a representative general/environment card', () => {
    const card = basePassCard({
      id: 'fix_pip_ssl_cert',
      problem: 'SSLCertVerificationError when running pip install behind a corporate proxy',
      errorType: 'SSLCertVerificationError',
      environment: { language: 'general' },
      provenance: { source: 'seed', category: 'general', addedAt: '2026-07-25T12:00:00.000Z' },
    });
    expect(knowledgeCardSchema.safeParse(card).success).toBe(true);
  });

  it('rejects a PASS card missing execution log evidence', () => {
    const card = basePassCard({
      verification: {
        status: 'PASS',
        score: 0.99,
        lastVerified: '2026-07-25T14:00:00.000Z',
        sandbox: 'docker',
        exitCode: 0,
        durationMs: 420,
        stdout: '',
        stderr: '',
      },
    });
    const result = knowledgeCardSchema.safeParse(card);
    expect(result.success).toBe(false);
  });

  it('rejects a PASS card with a non-zero exit code', () => {
    const card = basePassCard({
      verification: {
        status: 'PASS',
        score: 0.99,
        lastVerified: '2026-07-25T14:00:00.000Z',
        sandbox: 'docker',
        exitCode: 1,
        durationMs: 420,
        stdout: 'OK',
        stderr: '',
      },
    });
    expect(knowledgeCardSchema.safeParse(card).success).toBe(false);
  });

  it('accepts a FAIL card without execution evidence but never trusts it', () => {
    const card = basePassCard({
      verification: {
        status: 'FAIL',
        score: 0,
        lastVerified: '2026-07-25T14:00:00.000Z',
        sandbox: 'docker',
      },
    });
    const result = knowledgeCardSchema.safeParse(card);
    expect(result.success).toBe(true);
    expect(isTrustedForIndexing(card)).toBe(false);
  });

  it('isTrustedForIndexing returns true only for a real evidenced PASS card', () => {
    expect(isTrustedForIndexing(basePassCard())).toBe(true);
  });

  it('rejects a malformed (non-unified-diff) patch', () => {
    const card = basePassCard({ patch: 'just change the import line, trust me' });
    expect(knowledgeCardSchema.safeParse(card).success).toBe(false);
  });

  it('rejects an impossible verification score', () => {
    const card = basePassCard({
      verification: {
        status: 'PASS',
        score: 1.5,
        lastVerified: '2026-07-25T14:00:00.000Z',
        sandbox: 'docker',
        exitCode: 0,
        durationMs: 420,
        stdout: 'OK',
        stderr: '',
      },
    });
    expect(knowledgeCardSchema.safeParse(card).success).toBe(false);
  });

  it('rejects an invalid lastVerified timestamp', () => {
    const card = basePassCard({
      verification: {
        status: 'PASS',
        score: 0.9,
        lastVerified: 'not-a-real-timestamp',
        sandbox: 'docker',
        exitCode: 0,
        durationMs: 420,
        stdout: 'OK',
        stderr: '',
      },
    });
    expect(knowledgeCardSchema.safeParse(card).success).toBe(false);
  });

  it('rejects an unstable id (uppercase/spaces)', () => {
    const card = basePassCard({ id: 'Fix Pydantic V2' });
    expect(knowledgeCardSchema.safeParse(card).success).toBe(false);
  });

  it('rejects an embedding whose length does not match embeddingDimensions', () => {
    const card = basePassCard({ embedding: [0.1, 0.2, 0.3], embeddingDimensions: 8 });
    expect(knowledgeCardSchema.safeParse(card).success).toBe(false);
  });
});
