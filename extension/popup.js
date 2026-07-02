import { message } from "./i18n.js";

const enabled = document.querySelector("#enabled");
const autoLogin = document.querySelector("#auto-login");
const status = document.querySelector("#status");
const retry = document.querySelector("#retry");
const credentialForm = document.querySelector("#credential-form");
const credentialUser = document.querySelector("#credential-user");
const credentialPass = document.querySelector("#credential-pass");
const credentialError = document.querySelector("#credential-error");
const credentialSaved = document.querySelector("#credential-saved");
const credentialName = document.querySelector("#credential-name");
const credentialClear = document.querySelector("#credential-clear");
let pollTimer;

document.documentElement.lang = message("@@ui_locale").replace("_", "-");
for (const element of document.querySelectorAll("[data-i18n]")) {
  element.textContent = message(element.dataset.i18n);
}

const STATUS_TEXT = {
  idle: message("engineIdle"),
  loading: message("engineLoading"),
  ready: message("engineReady"),
  error: message("engineError")
};

async function checkEngine({ retryEngine = false } = {}) {
  window.clearTimeout(pollTimer);
  try {
    const result = await chrome.runtime.sendMessage({
      type: "engine-status",
      retry: retryEngine
    });
    const engineStatus = result?.status || "error";
    status.textContent =
      engineStatus === "error" && result?.error
        ? `${STATUS_TEXT.error}：${result.error}`
        : STATUS_TEXT[engineStatus] || STATUS_TEXT.error;
    status.className =
      engineStatus === "ready"
        ? "ok"
        : engineStatus === "error"
          ? "error"
          : "loading";
    retry.hidden = engineStatus !== "error";
    if (engineStatus === "loading" || engineStatus === "idle") {
      pollTimer = window.setTimeout(checkEngine, 500);
    }
  } catch (error) {
    status.textContent = message("backgroundUnavailable", error.message);
    status.className = "error";
    retry.hidden = false;
  }
}

function updateAutoLoginAvailability() {
  autoLogin.disabled = !enabled.checked;
}

function showCredentialError(text) {
  credentialError.textContent = text;
  credentialError.hidden = !text;
}

async function refreshCredentialUI() {
  const active = enabled.checked && autoLogin.checked;
  if (!active) {
    credentialForm.hidden = true;
    credentialSaved.hidden = true;
    return;
  }
  try {
    const result = await chrome.runtime.sendMessage({
      type: "credentials-status"
    });
    const saved = Boolean(result?.ok && result.saved);
    credentialForm.hidden = saved;
    credentialSaved.hidden = !saved;
    credentialName.textContent = saved ? result.user : "";
  } catch {
    credentialForm.hidden = true;
    credentialSaved.hidden = true;
  }
}

chrome.storage.local.get({ enabled: true, autoLogin: false }).then((data) => {
  enabled.checked = data.enabled;
  autoLogin.checked = data.autoLogin;
  updateAutoLoginAvailability();
  refreshCredentialUI();
});
enabled.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: enabled.checked });
  updateAutoLoginAvailability();
  refreshCredentialUI();
});
autoLogin.addEventListener("change", () => {
  chrome.storage.local.set({ autoLogin: autoLogin.checked });
  refreshCredentialUI();
});
credentialForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showCredentialError("");
  const user = credentialUser.value.trim();
  const pass = credentialPass.value;
  if (!user || !pass) {
    showCredentialError(message("credentialsRequired"));
    return;
  }
  try {
    const result = await chrome.runtime.sendMessage({
      type: "credentials-save",
      user,
      pass
    });
    if (!result?.ok) throw new Error(result?.error || message("saveFailed"));
    credentialUser.value = "";
    credentialPass.value = "";
    refreshCredentialUI();
  } catch (error) {
    showCredentialError(message("saveFailedDetail", error.message));
  }
});
credentialClear.addEventListener("click", async () => {
  try {
    const result = await chrome.runtime.sendMessage({
      type: "credentials-clear"
    });
    if (!result?.ok) throw new Error(result?.error || message("clearFailed"));
  } finally {
    refreshCredentialUI();
  }
});
retry.addEventListener("click", () => checkEngine({ retryEngine: true }));
checkEngine();
