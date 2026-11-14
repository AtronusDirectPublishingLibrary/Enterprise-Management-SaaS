import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { stableStringify } from "./auditChain";
import { verifyAuditCheckpoint } from "./auditCheckpoint";

test("Ed25519 checkpoint signatures detect payload tampering", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const payload = {
    version: 1,
    generatedAt: "2026-01-01T00:00:00.000Z",
    headId: "42",
    headHash: "abc",
    checkedCount: 42,
    previousHash: null,
  };
  const signature = crypto.sign(null, Buffer.from(stableStringify(payload)), privateKey).toString("base64");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();

  assert.equal(verifyAuditCheckpoint({ payload, signature, publicKeyPem }), true);
  assert.equal(
    verifyAuditCheckpoint({ payload: { ...payload, headHash: "tampered" }, signature, publicKeyPem }),
    false,
  );
  assert.equal(
    verifyAuditCheckpoint({ payload, signature: "not-a-signature", publicKeyPem }),
    false,
  );
});
