/**
 * Security tests for authentication (§11.3, §12.1, §12.4).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { authenticate } from "../../src/security/auth";
import { UnauthorizedError } from "../../src/domain/errors";

test("fails closed when MCP_AUTH_TOKEN is not configured", () => {
  const original = process.env.MCP_AUTH_TOKEN;
  delete process.env.MCP_AUTH_TOKEN;
  try {
    assert.throws(() => authenticate("Bearer anything"), UnauthorizedError);
  } finally {
    if (original !== undefined) process.env.MCP_AUTH_TOKEN = original;
  }
});

test("rejects missing Authorization header", () => {
  process.env.MCP_AUTH_TOKEN = "test-token-value";
  try {
    assert.throws(() => authenticate(undefined), UnauthorizedError);
  } finally {
    delete process.env.MCP_AUTH_TOKEN;
  }
});

test("rejects malformed (non-Bearer) Authorization header", () => {
  process.env.MCP_AUTH_TOKEN = "test-token-value";
  try {
    assert.throws(() => authenticate("Basic dXNlcjpwYXNz"), UnauthorizedError);
  } finally {
    delete process.env.MCP_AUTH_TOKEN;
  }
});

test("rejects an incorrect token", () => {
  process.env.MCP_AUTH_TOKEN = "correct-token";
  try {
    assert.throws(() => authenticate("Bearer wrong-token"), UnauthorizedError);
  } finally {
    delete process.env.MCP_AUTH_TOKEN;
  }
});

test("accepts a correctly presented Bearer token", () => {
  process.env.MCP_AUTH_TOKEN = "correct-token";
  try {
    const ctx = authenticate("Bearer correct-token");
    assert.ok(ctx.principalId);
    assert.ok(ctx.authenticatedAt);
  } finally {
    delete process.env.MCP_AUTH_TOKEN;
  }
});
