export const AUTO_LOGIN_DELAY_MS = 500;
export const AUTOFILL_POLL_INTERVAL_MS = 250;
export const AUTOFILL_POLL_DURATION_MS = 15_000;
export const MAX_AUTO_SUBMITS = 3;

export function isCredentialFilled(input) {
  if (!input) return false;
  return typeof input.value === "string" && input.value.trim().length > 0;
}

export function shouldAutoSubmit({
  enabled,
  autoLogin,
  captchaFilled,
  userFilled,
  passFilled,
  buttonVisible,
  buttonDisabled,
  fingerprint,
  gate
}) {
  return Boolean(
    enabled &&
      autoLogin &&
      captchaFilled &&
      userFilled &&
      passFilled &&
      buttonVisible &&
      !buttonDisabled &&
      gate?.canSubmit(fingerprint)
  );
}

export class SubmissionGate {
  constructor(maxAttempts = MAX_AUTO_SUBMITS) {
    this.maxAttempts = maxAttempts;
    this.attempts = 0;
    this.fingerprints = new Set();
  }

  canSubmit(fingerprint) {
    return Boolean(
      fingerprint &&
        this.attempts < this.maxAttempts &&
        !this.fingerprints.has(fingerprint)
    );
  }

  record(fingerprint) {
    if (!this.canSubmit(fingerprint)) return false;
    this.fingerprints.add(fingerprint);
    this.attempts += 1;
    return true;
  }
}
