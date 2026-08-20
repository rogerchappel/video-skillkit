import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

test("brief completes with normalized null and wrong-type package metadata", async () => {
  const fixtures = [
    { packageJson: null, summary: "Null package summary." },
    {
      packageJson: { name: ["wrong"], description: { wrong: true }, scripts: false },
      summary: "Wrong-type package summary."
    }
  ];

  for (const [index, fixture] of fixtures.entries()) {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "video-skillkit-cli-package-"));
    const repo = path.join(cwd, `source-${index}`);
    const outDir = path.join(cwd, "video-plan");
    await mkdir(repo);
    await writeFile(path.join(repo, "README.md"), `# Example\n\n${fixture.summary}\n`);
    await writeFile(path.join(repo, "package.json"), `${JSON.stringify(fixture.packageJson)}\n`);

    const result = runCli(["brief", repo, "--out", outDir], cwd);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.doesNotMatch(result.stderr, /stack|at file:/i);

    const manifest = JSON.parse(await readFile(path.join(outDir, "video.json"), "utf8"));
    assert.equal(manifest.product.name, path.basename(repo));
    assert.equal(manifest.product.description, fixture.summary);
    for (const value of [manifest.title, manifest.product.name, manifest.script, ...manifest.captions]) {
      assert.equal(typeof value, "string");
      assert.doesNotMatch(value, /\[object Object\]|wrong/);
    }
    await rm(cwd, { recursive: true, force: true });
  }
});

test("brief completes with syntactically invalid package metadata", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "video-skillkit-cli-invalid-package-"));
  const repo = path.join(cwd, "source-repo");
  const outDir = path.join(cwd, "video-plan");
  await mkdir(repo);
  await writeFile(path.join(repo, "README.md"), "# Example\n\nInvalid JSON fallback summary.\n");
  await writeFile(path.join(repo, "package.json"), '{"name":');

  const result = runCli(["brief", repo, "--out", outDir], cwd);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /Wrote .*video\.json/);
  const manifest = JSON.parse(await readFile(path.join(outDir, "video.json"), "utf8"));
  assert.equal(manifest.product.name, path.basename(repo));
  assert.equal(manifest.product.description, "Invalid JSON fallback summary.");
  await rm(cwd, { recursive: true, force: true });
});

test("validate returns a JSON report for malformed core fields", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "video-skillkit-cli-"));
  const file = path.join(cwd, "video.json");
  await writeFile(file, JSON.stringify({
    schemaVersion: "video-skillkit.v1",
    repoRoot: [],
    title: {},
    hook: 42,
    script: true,
    scenes: [null],
    safetyNotes: [false],
    assets: []
  }));

  const result = runCli(["validate", file], cwd);
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  assert.equal(report.ok, false);
  assert.deepEqual(report.errors, [
    "title must be a non-empty string",
    "hook must be a non-empty string",
    "script must be a non-empty string",
    "repoRoot must be a non-empty string",
    "Scene at index 0 must be an object",
    "Safety note at index 0 must be a non-empty string"
  ]);
  assert.equal(report.checkedAssets, 0);
  await rm(cwd, { recursive: true, force: true });
});
