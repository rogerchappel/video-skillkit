import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const cli = path.resolve("bin/video-skillkit.js");
const fixtureRepo = path.resolve("fixtures/product-repo");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });
}

test("brief rejects --out without a value", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "video-skillkit-cli-"));
  const result = runCli(["brief", fixtureRepo, "--out"], cwd);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing value for --out/);
  assert.match(result.stderr, /Usage:/);
  await rm(cwd, { recursive: true, force: true });
});

test("commands reject unknown options", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "video-skillkit-cli-"));
  const result = runCli(["validate", "video.json", "--bogus"], cwd);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown option: --bogus/);
  assert.match(result.stderr, /Usage:/);
  await rm(cwd, { recursive: true, force: true });
});

test("commands reject unexpected positional arguments", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "video-skillkit-cli-"));
  const result = runCli(["brief", fixtureRepo, "extra"], cwd);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unexpected argument: extra/);
  assert.match(result.stderr, /Usage:/);
  await rm(cwd, { recursive: true, force: true });
});

test("documented brief and validate commands succeed", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "video-skillkit-cli-"));
  const outDir = path.join(cwd, "video-plan");
  const brief = runCli(["brief", fixtureRepo, "--out", outDir], cwd);

  assert.equal(brief.status, 0, brief.stderr);
  assert.match(brief.stdout, /Wrote .*video\.json/);
  const manifest = JSON.parse(await readFile(path.join(outDir, "video.json"), "utf8"));
  assert.equal(manifest.schemaVersion, "video-skillkit.v1");

  const validate = runCli(["validate", path.join(outDir, "video.json")], cwd);
  assert.equal(validate.status, 0, validate.stderr);
  assert.equal(JSON.parse(validate.stdout).ok, true);
  await rm(cwd, { recursive: true, force: true });
});
