import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTO_LOGIN_DELAY_MS,
  AUTOFILL_POLL_DURATION_MS,
  AUTOFILL_POLL_INTERVAL_MS,
  isCredentialFilled,
  MAX_AUTO_SUBMITS,
  shouldAutoSubmit,
  SubmissionGate
} from "../extension/auto-login.js";

test("only trusts values that page scripts can actually read", () => {
  assert.equal(isCredentialFilled({ value: "saved-user" }), true);
  assert.equal(isCredentialFilled({ value: "  " }), false);
  assert.equal(isCredentialFilled({ value: "" }), false);
  assert.equal(isCredentialFilled(null), false);
  // Chromium 预填充（:-webkit-autofill）状态下 value 对脚本不可读，
  // 不能视为已填充，否则会以空密码自动提交。
  assert.equal(
    isCredentialFilled({
      value: "",
      matches: (selector) => selector === ":-webkit-autofill"
    }),
    false
  );
});

test("requires every safety condition before auto-submit", () => {
  const gate = new SubmissionGate();
  const ready = {
    enabled: true,
    autoLogin: true,
    captchaFilled: true,
    userFilled: true,
    passFilled: true,
    buttonVisible: true,
    buttonDisabled: false,
    fingerprint: "captcha-1",
    gate
  };
  assert.equal(shouldAutoSubmit(ready), true);
  for (const field of [
    "enabled",
    "autoLogin",
    "captchaFilled",
    "userFilled",
    "passFilled",
    "buttonVisible"
  ]) {
    assert.equal(shouldAutoSubmit({ ...ready, [field]: false }), false, field);
  }
  assert.equal(shouldAutoSubmit({ ...ready, buttonDisabled: true }), false);
});

test("submits each captcha once and stops after three attempts", () => {
  const gate = new SubmissionGate();
  assert.equal(gate.record("captcha-1"), true);
  assert.equal(gate.record("captcha-1"), false);
  assert.equal(gate.record("captcha-2"), true);
  assert.equal(gate.record("captcha-3"), true);
  assert.equal(gate.record("captcha-4"), false);
  assert.equal(gate.attempts, MAX_AUTO_SUBMITS);
});

test("uses the specified delay and polling window", () => {
  assert.equal(AUTO_LOGIN_DELAY_MS, 500);
  assert.equal(AUTOFILL_POLL_INTERVAL_MS, 250);
  assert.equal(AUTOFILL_POLL_DURATION_MS, 15_000);
});
