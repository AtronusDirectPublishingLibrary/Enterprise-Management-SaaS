import assert from "node:assert/strict";
import test from "node:test";
import { allows, canGovernPlans, isAdminUser } from "./access";

test("administrators and the Strategy and Planning Officer are system admins", () => {
  assert.equal(isAdminUser({ role: "admin" }), true);
  assert.equal(isAdminUser({ role: "staff", position: "Strategy and Planning Officer" }), true);
  assert.equal(isAdminUser({ role: "staff", position: "Engineer" }), false);
});

test("audit access is limited to governance, audit and HR roles", () => {
  assert.equal(allows({ role: "staff", position: "Internal Audit Officer" }, "audit"), true);
  assert.equal(allows({ role: "executive" }, "audit"), true);
  assert.equal(allows({ role: "staff", position: "Engineer" }, "audit"), false);
  assert.equal(allows({ role: "staff" }, "users"), false);
});

test("plan governance is a two-office control", () => {
  assert.equal(canGovernPlans({ role: "executive", position: "Chief Executive Officer" }), true);
  assert.equal(canGovernPlans({ role: "staff", position: "Strategy and Planning Officer" }), true);
  assert.equal(canGovernPlans({ role: "staff", position: "Finance Officer" }), false);
});
