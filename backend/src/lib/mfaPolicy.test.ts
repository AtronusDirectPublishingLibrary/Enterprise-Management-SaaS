import assert from "node:assert/strict";
import test from "node:test";
import { mfaEnforcementMode, mfaRequiredFor } from "./mfaPolicy";
import { hashRecoveryCode, normalizeRecoveryCode } from "./mfaRecovery";

test("MFA is enforced by default in production for privileged roles", () => {
  const previous = { nodeEnv: process.env.NODE_ENV, mode: process.env.MFA_ENFORCEMENT };
  process.env.NODE_ENV = "production";
  delete process.env.MFA_ENFORCEMENT;
  assert.equal(mfaEnforcementMode(), "required");
  assert.equal(mfaRequiredFor({ role: "executive", position: "Finance Manager" }), true);
  assert.equal(mfaRequiredFor({ role: "staff", position: "Engineer" }), false);
  process.env.MFA_ENFORCEMENT = "optional";
  assert.equal(mfaRequiredFor({ role: "admin" }), false);
  if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previous.nodeEnv;
  if (previous.mode === undefined) delete process.env.MFA_ENFORCEMENT;
  else process.env.MFA_ENFORCEMENT = previous.mode;
});

test("recovery codes normalize punctuation and hash deterministically", () => {
  assert.equal(normalizeRecoveryCode("abcd-efgh"), "ABCDEFGH");
  assert.equal(hashRecoveryCode("ABCD-EFGH"), hashRecoveryCode("abcd efgh"));
  assert.notEqual(hashRecoveryCode("ABCD-EFGH"), hashRecoveryCode("ABCD-EFGI"));
});
