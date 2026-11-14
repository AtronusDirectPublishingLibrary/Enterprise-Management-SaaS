import assert from "node:assert/strict";
import test from "node:test";
import { computeAuditHash, stableStringify } from "./auditChain";

test("canonical JSON ignores object key order", () => {
  assert.equal(
    stableStringify({ b: 2, a: { d: 4, c: 3 } }),
    stableStringify({ a: { c: 3, d: 4 }, b: 2 }),
  );
});

test("audit hashes are deterministic and cover the previous hash", () => {
  const base = {
    prevHash: "abc",
    grantId: "HR",
    action: "LEAVE_APPROVED",
    user: "manager",
    details: { requestId: "r1", days: 2 },
    timestamp: new Date("2026-01-01T00:00:00.000Z"),
    nonce: "nonce-1",
  };
  assert.equal(computeAuditHash(base), computeAuditHash({ ...base }));
  assert.notEqual(computeAuditHash(base), computeAuditHash({ ...base, prevHash: "def" }));
  assert.notEqual(computeAuditHash(base), computeAuditHash({ ...base, details: { requestId: "r1", days: 3 } }));
});

test("null and undefined details are canonicalised consistently", () => {
  assert.equal(stableStringify({ a: null, b: undefined }), stableStringify({ b: null, a: null }));
});
