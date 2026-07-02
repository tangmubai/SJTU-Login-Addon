import { mkdir, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const release = path.join(root, "release");
const manifest = JSON.parse(
  await readFile(path.join(dist, "manifest.json"), "utf8")
);
const archive = path.join(
  release,
  `SJTU-Autologin-${manifest.version}.zip`
);

await mkdir(release, { recursive: true });
await rm(archive, { force: true });
const result = spawnSync(
  "tar",
  ["-a", "-c", "-f", archive, "-C", dist, "."],
  { encoding: "utf8" }
);
if (result.status !== 0) {
  throw new Error(result.stderr || result.stdout || "Failed to create ZIP");
}
console.log(`Packaged extension: ${archive}`);
