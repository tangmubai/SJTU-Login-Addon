import * as ort from "onnxruntime-web/wasm";
import { decodeCtc } from "./ctc.js";
import { message } from "./i18n.js";

const MODEL_URL = "assets/common.onnx";
const CHARSET_URL = "assets/charset-beta.json";
const TARGET_HEIGHT = 64;

let sessionPromise;
let charsetPromise;
let status = "idle";
let lastError = "";

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

export function getEngineStatus() {
  return { status, error: lastError };
}

export function initializeEngine({ retry = false } = {}) {
  if (retry && status === "error") {
    sessionPromise = undefined;
    charsetPromise = undefined;
    status = "idle";
    lastError = "";
  }
  if (sessionPromise) return sessionPromise;

  status = "loading";
  lastError = "";
  charsetPromise = loadCharset();
  sessionPromise = Promise.all([
    ort.InferenceSession.create(chrome.runtime.getURL(MODEL_URL), {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all"
    }),
    charsetPromise
  ])
    .then(([session]) => {
      status = "ready";
      return session;
    })
    .catch((error) => {
      status = "error";
      lastError = error instanceof Error ? error.message : String(error);
      throw error;
    });

  return sessionPromise;
}

async function loadCharset() {
  const response = await fetch(chrome.runtime.getURL(CHARSET_URL));
  if (!response.ok) {
    throw new Error(message("charsetLoadFailed", String(response.status)));
  }
  const charset = await response.json();
  if (!Array.isArray(charset) || charset[0] !== "") {
    throw new Error(message("invalidCharset"));
  }
  return charset;
}

export async function recognizeCaptcha(dataUrl) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    throw new Error(message("invalidCaptchaImage"));
  }
  const [session, charset] = await Promise.all([
    initializeEngine(),
    charsetPromise
  ]);
  const { data, width } = await preprocessImage(dataUrl);
  const input = new ort.Tensor("float32", data, [
    1,
    1,
    TARGET_HEIGHT,
    width
  ]);
  const feeds = { [session.inputNames[0]]: input };
  const results = await session.run(feeds);
  const output = results[session.outputNames[0]];
  return decodeCtc(output.data, output.dims, charset);
}

async function preprocessImage(dataUrl) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  try {
    const width = Math.max(
      1,
      Math.trunc(bitmap.width * (TARGET_HEIGHT / bitmap.height))
    );
    const canvas = new OffscreenCanvas(width, TARGET_HEIGHT);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error(message("captchaCanvasUnavailable"));
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, TARGET_HEIGHT);
    const rgba = context.getImageData(0, 0, width, TARGET_HEIGHT).data;
    const data = new Float32Array(width * TARGET_HEIGHT);
    for (let pixel = 0, offset = 0; pixel < data.length; pixel++, offset += 4) {
      data[pixel] =
        (rgba[offset] * 0.299 +
          rgba[offset + 1] * 0.587 +
          rgba[offset + 2] * 0.114) /
        255;
    }
    return { data, width };
  } finally {
    bitmap.close();
  }
}
