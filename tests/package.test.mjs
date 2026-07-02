import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "extension");
const expectedHash =
  "33b5cd351ee94e73a6bf8fa18c415ed8b819b3ffd342e267c30d8ad8334e34e8";

test("manifest is self-contained and MV3-compatible", async () => {
  const manifest = JSON.parse(
    await readFile(path.join(source, "manifest.json"), "utf8")
  );
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, "0.4.1");
  assert.equal(manifest.minimum_chrome_version, "103");
  assert.equal(manifest.background.type, "module");
  assert.match(
    manifest.content_security_policy.extension_pages,
    /wasm-unsafe-eval/
  );
  assert.equal(JSON.stringify(manifest).includes("127.0.0.1"), false);
  assert.equal(JSON.stringify(manifest).includes("localhost"), false);
});

test("bundled model has the pinned digest", async () => {
  const model = await readFile(path.join(source, "assets", "common.onnx"));
  assert.equal(createHash("sha256").update(model).digest("hex"), expectedHash);
});

test("extension source has no reserved underscore-prefixed names", async () => {
  async function walk(directory) {
    const entries = await readdir(directory);
    for (const entry of entries) {
      assert.equal(entry.startsWith("_"), false, entry);
      const child = path.join(directory, entry);
      if ((await stat(child)).isDirectory()) await walk(child);
    }
  }
  await walk(source);
});

test("content script targets the password-login captcha, not SMS or icon", async () => {
  const content = await readFile(path.join(source, "content.js"), "utf8");
  assert.match(content, /#captcha-img/);
  assert.match(content, /#input-login-captcha/);
  assert.match(content, /name="captcha"\]\[type="text"/);
  assert.doesNotMatch(content, /img\[src\*="captcha"\]/);
  assert.doesNotMatch(content, /'input\[name="captcha"\]'/);
});

test("popup exposes an opt-in auto-login setting", async () => {
  const [html, script] = await Promise.all([
    readFile(path.join(source, "popup.html"), "utf8"),
    readFile(path.join(source, "popup.js"), "utf8")
  ]);
  assert.match(html, /id="auto-login"/);
  assert.match(script, /autoLogin:\s*false/);
});
