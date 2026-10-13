/**
 * Security tests for the generic request-envelope validator (§12.7, §12.8).
 *
 * Two things are asserted here:
 *  1. `input-validation.ts`'s own functions behave correctly in isolation.
 *  2. The envelope check is actually reachable from a real tool invocation
 *     via `tool-runtime.ts`'s `runTool()` — this module previously existed
 *     but was never called from the pipeline, so its checks provided no
 *     real protection. A regression here would mean that gap re-opened.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  assertBoundedPayloadSize,
  assertNoDangerousContent,
  assertPlainRequestObject,
  validateRequestEnvelope,
} from "../../src/security/input-validation";
import { InvalidInputError } from "../../src/domain/errors";
import { getTransactionHandler } from "../../src/modules/transaction.tools";

const AUTH_TOKEN = "envelope-test-token";

function withAuth<T>(run: () => T): T {
  process.env.MCP_AUTH_TOKEN = AUTH_TOKEN;
  try {
    return run();
  } finally {
    delete process.env.MCP_AUTH_TOKEN;
  }
}

test("rejects a non-object payload", () => {
  assert.throws(() => assertPlainRequestObject("not-an-object", "test input"), InvalidInputError);
  assert.throws(() => assertPlainRequestObject(null, "test input"), InvalidInputError);
  assert.throws(() => assertPlainRequestObject(["array"], "test input"), InvalidInputError);
});

test("accepts a plain object payload", () => {
  const result = assertPlainRequestObject({ a: 1 }, "test input");
  assert.deepEqual(result, { a: 1 });
});

test("rejects a payload over the size ceiling", () => {
  const oversized = { blob: "x".repeat(40_000) };
  assert.throws(() => assertBoundedPayloadSize(oversized, "test input"), InvalidInputError);
});

test("accepts a payload within the size ceiling", () => {
  assert.doesNotThrow(() => assertBoundedPayloadSize({ transactionId: "TX-827" }, "test input"));
});

test("rejects shell command substitution content", () => {
  assert.throws(
    () => assertNoDangerousContent({ note: "$(rm -rf /)" }, "test input"),
    InvalidInputError
  );
});

test("rejects backtick shell execution content", () => {
  assert.throws(
    () => assertNoDangerousContent({ note: "`whoami`" }, "test input"),
    InvalidInputError
  );
});

test("rejects SQL injection-style content", () => {
  assert.throws(
    () => assertNoDangerousContent({ note: "1; DROP TABLE users;" }, "test input"),
    InvalidInputError
  );
  assert.throws(
    () => assertNoDangerousContent({ note: "' UNION SELECT * FROM secrets" }, "test input"),
    InvalidInputError
  );
});

test("rejects embedded <script> content", () => {
  assert.throws(
    () => assertNoDangerousContent({ note: "<script>alert(1)</script>" }, "test input"),
    InvalidInputError
  );
});

test("dangerous-content check recurses into nested arrays/objects", () => {
  assert.throws(
    () => assertNoDangerousContent({ nested: { list: ["fine", "$(evil)"] } }, "test input"),
    InvalidInputError
  );
});

test("benign content passes the dangerous-content check", () => {
  assert.doesNotThrow(() =>
    assertNoDangerousContent({ transactionId: "TX-827", note: "Net 30 terms." }, "test input")
  );
});

test("validateRequestEnvelope runs all three checks and returns the object", () => {
  const result = validateRequestEnvelope({ transactionId: "TX-827" }, "getTransaction input");
  assert.deepEqual(result, { transactionId: "TX-827" });
});

test("validateRequestEnvelope rejects an oversized payload before any per-tool schema runs", () => {
  assert.throws(
    () => validateRequestEnvelope({ transactionId: "TX-827", junk: "x".repeat(40_000) }, "ctx"),
    InvalidInputError
  );
});

// --- Pipeline wiring: the envelope check must actually run inside runTool() ---

test("a real tool call rejects a payload containing dangerous content, via the shared pipeline", () => {
  withAuth(() => {
    assert.throws(
      () =>
        getTransactionHandler(
          { transactionId: "TX-827", note: "$(malicious)" },
          { correlationId: "corr-envelope-1", authorizationHeader: `Bearer ${AUTH_TOKEN}` }
        ),
      InvalidInputError
    );
  });
});

test("a real tool call rejects an oversized payload, via the shared pipeline", () => {
  withAuth(() => {
    assert.throws(
      () =>
        getTransactionHandler(
          { transactionId: "TX-827", junk: "x".repeat(40_000) },
          { correlationId: "corr-envelope-2", authorizationHeader: `Bearer ${AUTH_TOKEN}` }
        ),
      InvalidInputError
    );
  });
});

test("a well-formed real tool call still passes through the envelope check", () => {
  withAuth(() => {
    const result = getTransactionHandler(
      { transactionId: "TX-827" },
      { correlationId: "corr-envelope-3", authorizationHeader: `Bearer ${AUTH_TOKEN}` }
    ) as { transactionId: string };
    assert.equal(result.transactionId, "TX-827");
  });
});
