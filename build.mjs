import { build } from "esbuild";
import {
  cp,
  copyFile,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "extension");
const output = path.join(root, "dist");
const assetOutput = path.join(output, "assets");
const modelPath = path.join(source, "assets", "common.onnx");
const charsetPath = path.join(source, "assets", "charset-beta.json");
const wasmPath = path.join(
  root,
  "node_modules",
  "onnxruntime-web",
  "dist",
  "ort-wasm-simd-threaded.wasm"
);
const expectedModelHash =
  "33b5cd351ee94e73a6bf8fa18c415ed8b819b3ffd342e267c30d8ad8334e34e8";

await Promise.all([stat(modelPath), stat(charsetPath), stat(wasmPath)]);
const modelHash = createHash("sha256")
  .update(await readFile(modelPath))
  .digest("hex");
if (modelHash !== expectedModelHash) {
  throw new Error(
    `Unexpected common.onnx SHA-256: ${modelHash}; expected ${expectedModelHash}`
  );
}
await rm(output, { recursive: true, force: true });
await mkdir(assetOutput, { recursive: true });

await Promise.all([
  build({
    absWorkingDir: root,
    entryPoints: [path.join(source, "background.js")],
    outfile: path.join(output, "background.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "chrome103",
    minify: true,
    legalComments: "none"
  }),
  build({
    absWorkingDir: root,
    entryPoints: [path.join(source, "content.js")],
    outfile: path.join(output, "content.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "chrome103",
    minify: true,
    legalComments: "none"
  }),
  build({
    absWorkingDir: root,
    entryPoints: [path.join(source, "popup.js")],
    outfile: path.join(output, "popup.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "chrome103",
    minify: true,
    legalComments: "none"
  })
]);

const staticFiles = [
  "manifest.json",
  "popup.html",
  "popup.css",
  "THIRD_PARTY_NOTICES.txt"
];
await Promise.all(
  staticFiles.map((name) =>
    copyFile(path.join(source, name), path.join(output, name))
  )
);
await cp(path.join(source, "_locales"), path.join(output, "_locales"), {
  recursive: true
});
await Promise.all(
  [16, 32, 48, 128].map((size) =>
    copyFile(
      path.join(source, "icons", `icon-${size}.png`),
      path.join(output, `icon-${size}.png`)
    )
  )
);
await Promise.all([
  copyFile(modelPath, path.join(assetOutput, "common.onnx")),
  copyFile(charsetPath, path.join(assetOutput, "charset-beta.json")),
  copyFile(wasmPath, path.join(output, "ort-wasm-simd-threaded.wasm"))
]);

const manifest = JSON.parse(
  await readFile(path.join(output, "manifest.json"), "utf8")
);
await writeFile(
  path.join(output, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(`Built extension: ${output}`);
