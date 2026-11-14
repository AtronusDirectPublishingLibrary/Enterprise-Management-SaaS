import assert from "node:assert/strict";
import test from "node:test";
import { assertTurnstileProductionConfig, turnstileConfig } from "./turnstile";

test("production refuses to start with Turnstile enabled but no secret", () => {
  const saved = {
    nodeEnv: process.env.NODE_ENV,
    enabled: process.env.TURNSTILE_ENABLED,
    secret: process.env.TURNSTILE_SECRET_KEY,
  };
  process.env.NODE_ENV = "production";
  delete process.env.TURNSTILE_ENABLED;
  delete process.env.TURNSTILE_SECRET_KEY;
  assert.equal(turnstileConfig().enabled, true);
  assert.throws(() => assertTurnstileProductionConfig(), /TURNSTILE_SECRET_KEY/);

  process.env.TURNSTILE_ENABLED = "false";
  assert.doesNotThrow(() => assertTurnstileProductionConfig());

  if (saved.nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = saved.nodeEnv;
  if (saved.enabled === undefined) delete process.env.TURNSTILE_ENABLED;
  else process.env.TURNSTILE_ENABLED = saved.enabled;
  if (saved.secret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = saved.secret;
});
