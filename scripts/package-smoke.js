import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const tmp = await mkdtemp(path.join(os.tmpdir(), "video-skillkit-package-"));

try {
  const packDir = path.join(tmp, "pack");
  await mkdir(packDir);
  const { stdout } = await execFileAsync(
    npm,
    ["pack", "--json", "--pack-destination", packDir],
    { maxBuffer: 10 * 1024 * 1024 }
  );
  const [{ filename }] = JSON.parse(stdout);
  const tarball = path.join(packDir, filename);
  const consumer = path.join(tmp, "consumer");
  await mkdir(consumer);

  await execFileAsync(
    npm,
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--no-save", tarball],
    { cwd: consumer }
  );

  const installedPackage = path.join(consumer, "node_modules", "video-skillkit");
  const cli = path.join(installedPackage, "bin", "video-skillkit.js");
  const fixture = path.join(installedPackage, "fixtures", "product-repo");
  const output = path.join(consumer, "smoke");
  const manifest = path.join(output, "video.json");

  await execFileAsync(process.execPath, [cli, "brief", fixture, "--out", output]);
  const { stdout: validationOutput } = await execFileAsync(
    process.execPath,
    [cli, "validate", manifest]
  );
  const report = JSON.parse(validationOutput);
  if (!report.ok || report.checkedAssets !== 2) {
    throw new Error(`Unexpected package smoke report: ${validationOutput}`);
  }

  const generated = JSON.parse(await readFile(manifest, "utf8"));
  if (generated.product?.name !== "fixture-cli") {
    throw new Error("Packaged CLI did not generate the fixture manifest.");
  }

  process.stdout.write(`Packaged CLI smoke passed for ${filename}\n`);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
