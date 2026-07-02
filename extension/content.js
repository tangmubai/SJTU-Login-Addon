import {
  AUTO_LOGIN_DELAY_MS,
  AUTOFILL_POLL_DURATION_MS,
  AUTOFILL_POLL_INTERVAL_MS,
  isCredentialFilled,
  shouldAutoSubmit,
  SubmissionGate
} from "./auto-login.js";

const CAPTCHA_IMAGE_SELECTORS = [
  "#captcha-img",
  'img[src^="captcha?"]',
  'img[src*="/captcha?"]',
  'img[id*="captcha" i]:not(.img-icon)'
];
const CAPTCHA_INPUT_SELECTORS = [
  "#input-login-captcha",
  'input[name="captcha"][type="text"][placeholder*="验证码"]',
  'input[type="text"][placeholder="请输入验证码"]'
];

let lastImageData = "";
let running = false;
let debounceTimer;
let autoLoginTimer;
let pendingAutoLoginFingerprint = "";
let autofillPollTimer;
let autofillPollStopTimer;
let credentialRequestPending = false;
let storedCredentialsAbsent = false;
const submissionGate = new SubmissionGate();

async function getSettings() {
  return chrome.storage.local.get({
    enabled: true,
    autoLogin: false
  });
}

function findFirst(selectors, predicate = () => true) {
  for (const selector of selectors) {
    for (const element of document.querySelectorAll(selector)) {
      if (predicate(element)) return element;
    }
  }
  return null;
}

function isVisibleInput(element) {
  return (
    element instanceof HTMLInputElement &&
    !element.disabled &&
    element.getClientRects().length > 0
  );
}

function isCaptchaImage(element) {
  if (!(element instanceof HTMLImageElement)) return false;
  const source = element.getAttribute("src") || "";
  return (
    element.id === "captcha-img" ||
    /(^|\/)captcha(?:\?|$)/i.test(source)
  );
}

async function imageToDataUrl(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器无法创建图片画布");
  context.drawImage(image, 0, 0);
  return canvas.toDataURL("image/png");
}

function setInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

async function fillCaptcha() {
  if (running) return;
  const { enabled } = await getSettings();
  if (!enabled) {
    lastImageData = "";
    cancelPendingAutoLogin();
    return;
  }
  const image = findFirst(CAPTCHA_IMAGE_SELECTORS, isCaptchaImage);
  const input = findFirst(CAPTCHA_INPUT_SELECTORS, isVisibleInput);
  if (!image || !input) return;
  if (!image.complete || !image.naturalWidth) {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(fillCaptcha, 150);
    return;
  }

  running = true;

  try {
    input.dataset.sjtuOcrStatus = "recognizing";
    const dataUrl = await imageToDataUrl(image);
    if (dataUrl === lastImageData) return;
    lastImageData = dataUrl;
    const result = await chrome.runtime.sendMessage({
      type: "ocr",
      image: dataUrl
    });
    if (!result?.ok) throw new Error(result?.error || "OCR 请求失败");
    const text = String(result.text).replace(/\s+/g, "");
    if (!/^[a-zA-Z0-9]{3,8}$/.test(text)) {
      throw new Error(`识别结果格式异常：${text || "空"}`);
    }
    setInputValue(input, text);
    input.dataset.sjtuOcrStatus = "filled";
    requestAutoLogin(dataUrl);
  } catch (error) {
    input.dataset.sjtuOcrStatus = "error";
    console.warn("[SJTU CAPTCHA OCR]", error);
    lastImageData = "";
  } finally {
    running = false;
  }
}

function cancelPendingAutoLogin() {
  window.clearTimeout(autoLoginTimer);
  autoLoginTimer = undefined;
  pendingAutoLoginFingerprint = "";
}

function passwordLoginElements() {
  return {
    user: document.querySelector("#input-login-user"),
    pass: document.querySelector("#input-login-pass"),
    captcha: document.querySelector("#input-login-captcha"),
    button: document.querySelector("#submit-password-button")
  };
}

async function requestAutoLogin(fingerprint = lastImageData) {
  if (!fingerprint) return;
  if (pendingAutoLoginFingerprint === fingerprint) return;
  if (autoLoginTimer) cancelPendingAutoLogin();

  const settings = await getSettings();
  const { user, pass, captcha, button } = passwordLoginElements();
  const ready = shouldAutoSubmit({
    ...settings,
    captchaFilled:
      captcha?.dataset.sjtuOcrStatus === "filled" &&
      Boolean(captcha?.value.trim()),
    userFilled: isCredentialFilled(user),
    passFilled: isCredentialFilled(pass),
    buttonVisible: Boolean(button && button.getClientRects().length > 0),
    buttonDisabled: Boolean(button?.disabled),
    fingerprint,
    gate: submissionGate
  });
  if (!ready) return;

  pendingAutoLoginFingerprint = fingerprint;
  autoLoginTimer = window.setTimeout(async () => {
    autoLoginTimer = undefined;
    try {
      if (lastImageData !== fingerprint) return;

      const latestSettings = await getSettings();
      const latest = passwordLoginElements();
      const stillReady = shouldAutoSubmit({
        ...latestSettings,
        captchaFilled:
          latest.captcha?.dataset.sjtuOcrStatus === "filled" &&
          Boolean(latest.captcha?.value.trim()),
        userFilled: isCredentialFilled(latest.user),
        passFilled: isCredentialFilled(latest.pass),
        buttonVisible: Boolean(
          latest.button && latest.button.getClientRects().length > 0
        ),
        buttonDisabled: Boolean(latest.button?.disabled),
        fingerprint,
        gate: submissionGate
      });
      if (!stillReady || !submissionGate.record(fingerprint)) return;

      latest.captcha.dataset.sjtuOcrStatus = "submitting";
      latest.button.click();
    } finally {
      pendingAutoLoginFingerprint = "";
    }
  }, AUTO_LOGIN_DELAY_MS);
}

async function fillStoredCredentials() {
  if (credentialRequestPending || storedCredentialsAbsent) return;
  const { enabled, autoLogin } = await getSettings();
  if (!enabled || !autoLogin) return;
  const { user, pass } = passwordLoginElements();
  if (!isVisibleInput(user) || !isVisibleInput(pass)) return;
  const needsUser = !user.value.trim();
  const needsPass = !pass.value;
  if (!needsUser && !needsPass) return;

  credentialRequestPending = true;
  try {
    const result = await chrome.runtime.sendMessage({
      type: "credentials-get"
    });
    if (!result?.ok) throw new Error(result?.error || "凭据请求失败");
    if (!result.credentials) {
      storedCredentialsAbsent = true;
      return;
    }
    if (needsUser && !user.value.trim()) {
      setInputValue(user, result.credentials.user);
    }
    if (needsPass && !pass.value) {
      setInputValue(pass, result.credentials.pass);
    }
    requestAutoLogin();
  } catch (error) {
    console.warn("[SJTU CAPTCHA OCR] 获取本地凭据失败", error);
  } finally {
    credentialRequestPending = false;
  }
}

function startAutofillPolling() {
  window.clearInterval(autofillPollTimer);
  window.clearTimeout(autofillPollStopTimer);
  autofillPollTimer = window.setInterval(() => {
    fillStoredCredentials();
    requestAutoLogin();
  }, AUTOFILL_POLL_INTERVAL_MS);
  autofillPollStopTimer = window.setTimeout(() => {
    window.clearInterval(autofillPollTimer);
    autofillPollTimer = undefined;
  }, AUTOFILL_POLL_DURATION_MS);
}

const observer = new MutationObserver(() => {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    fillStoredCredentials();
    fillCaptcha();
  }, 100);
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["src"]
});
window.addEventListener("load", () => {
  fillStoredCredentials();
  fillCaptcha();
});
document.addEventListener(
  "load",
  (event) => {
    if (event.target instanceof HTMLImageElement) fillCaptcha();
  },
  true
);
for (const eventName of ["input", "change", "focus", "animationstart"]) {
  document.addEventListener(eventName, () => requestAutoLogin(), true);
}
chrome.storage.onChanged.addListener(() => {
  storedCredentialsAbsent = false;
  fillStoredCredentials();
  fillCaptcha();
  requestAutoLogin();
});
startAutofillPolling();
fillStoredCredentials();
fillCaptcha();
