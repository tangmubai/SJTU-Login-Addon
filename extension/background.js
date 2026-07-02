import {
  decryptCredentials,
  deleteKey,
  encryptCredentials,
  getOrCreateKey
} from "./credentials.js";
import {
  getEngineStatus,
  initializeEngine,
  recognizeCaptcha
} from "./ocr.js";

const CREDENTIAL_CIPHER_KEY = "credentialCipher";
const CREDENTIAL_USER_KEY = "credentialUser";
const LOGIN_PAGE_PREFIX = "https://jaccount.sjtu.edu.cn/";

chrome.runtime.onInstalled.addListener(() => {
  initializeEngine().catch(() => {});
});

function isOwnExtensionPage(sender) {
  return (
    sender.id === chrome.runtime.id &&
    Boolean(sender.url?.startsWith(chrome.runtime.getURL("")))
  );
}

function isLoginContentScript(sender) {
  return (
    sender.id === chrome.runtime.id &&
    Boolean(sender.url?.startsWith(LOGIN_PAGE_PREFIX))
  );
}

async function saveCredentials({ user, pass }) {
  if (typeof user !== "string" || typeof pass !== "string") {
    throw new Error("账号或密码格式无效");
  }
  const trimmedUser = user.trim();
  if (!trimmedUser || !pass) throw new Error("账号和密码不能为空");
  const key = await getOrCreateKey();
  const cipher = await encryptCredentials(key, {
    user: trimmedUser,
    pass
  });
  await chrome.storage.local.set({
    [CREDENTIAL_CIPHER_KEY]: cipher,
    [CREDENTIAL_USER_KEY]: trimmedUser
  });
}

async function readCredentials() {
  const stored = await chrome.storage.local.get(CREDENTIAL_CIPHER_KEY);
  const cipher = stored[CREDENTIAL_CIPHER_KEY];
  if (!cipher) return null;
  const key = await getOrCreateKey();
  return decryptCredentials(key, cipher);
}

async function clearCredentials() {
  await chrome.storage.local.remove([
    CREDENTIAL_CIPHER_KEY,
    CREDENTIAL_USER_KEY
  ]);
  await deleteKey();
}

function respondWith(promise, sendResponse) {
  promise
    .then((payload) => sendResponse({ ok: true, ...payload }))
    .catch((error) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      })
    );
  return true;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "engine-status") {
    if (message.retry || getEngineStatus().status === "idle") {
      initializeEngine({ retry: Boolean(message.retry) }).catch(() => {});
    }
    sendResponse(getEngineStatus());
    return false;
  }

  if (message?.type === "ocr") {
    recognizeCaptcha(message.image)
      .then((text) => sendResponse({ ok: true, text }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        })
      );
    return true;
  }

  if (message?.type === "credentials-save") {
    if (!isOwnExtensionPage(sender)) return false;
    return respondWith(
      saveCredentials({ user: message.user, pass: message.pass }).then(
        () => ({})
      ),
      sendResponse
    );
  }

  if (message?.type === "credentials-status") {
    if (!isOwnExtensionPage(sender)) return false;
    return respondWith(
      chrome.storage.local
        .get({ [CREDENTIAL_CIPHER_KEY]: null, [CREDENTIAL_USER_KEY]: "" })
        .then((data) => ({
          saved: Boolean(data[CREDENTIAL_CIPHER_KEY]),
          user: data[CREDENTIAL_USER_KEY]
        })),
      sendResponse
    );
  }

  if (message?.type === "credentials-clear") {
    if (!isOwnExtensionPage(sender)) return false;
    return respondWith(clearCredentials().then(() => ({})), sendResponse);
  }

  if (message?.type === "credentials-get") {
    if (!isLoginContentScript(sender)) return false;
    return respondWith(
      readCredentials().then((credentials) => ({ credentials })),
      sendResponse
    );
  }

  return false;
});
