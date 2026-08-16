import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildVideoBrief } from "../src/brief.js";
import { collectRepoFacts } from "../src/repoFacts.js";
import { validateManifest } from "../src/validate.js";

test("builds a grounded video manifest from fixture repo facts", async () => {
  const manifest = await buildVideoBrief("fixtures/product-repo");

  assert.equal(manifest.schemaVersion, "video-skillkit.v1");
  assert.equal(manifest.product.name, "fixture-cli");
  assert.ok(manifest.product.evidence.includes("README.md"));
  assert.equal(manifest.assets.length, 2);
});

test("normalizes null package metadata to repository and README facts", async () => {
  const repo = await mkdtemp(path.join(os.tmpdir(), "video-skillkit-null-package-"));
  await writeFile(path.join(repo, "README.md"), "# Example\n\nREADME fallback summary.\n");
  await writeFile(path.join(repo, "package.json"), "null\n");

  const facts = await collectRepoFacts(repo);
  const manifest = await buildVideoBrief(repo);

  assert.equal(facts.packageName, path.basename(repo));
  assert.equal(facts.packageDescription, null);
  assert.deepEqual(facts.scripts, []);
  assert.equal(manifest.product.name, path.basename(repo));
  assert.equal(manifest.product.description, "README fallback summary.");
  assertManifestTextIsNormalized(manifest);
  await rm(repo, { recursive: true, force: true });
});

test("normalizes arrays and wrong-type package fields", async () => {
  const repos = [
    { packageJson: [], summary: "Array package summary." },
    {
      packageJson: { name: { unexpected: true }, description: ["not", "text"], scripts: "npm test" },
      summary: "Wrong-type package summary."
    },
    { packageJson: { name: "  ", description: "\t", scripts: null }, summary: "Blank package summary." }
  ];

  for (const fixture of repos) {
    const repo = await mkdtemp(path.join(os.tmpdir(), "video-skillkit-wrong-package-"));
    await writeFile(path.join(repo, "README.md"), `# Example\n\n${fixture.summary}\n`);
    await writeFile(path.join(repo, "package.json"), `${JSON.stringify(fixture.packageJson)}\n`);

    const facts = await collectRepoFacts(repo);
    const manifest = await buildVideoBrief(repo);

    assert.equal(facts.packageName, path.basename(repo));
    assert.equal(facts.packageDescription, null);
    assert.deepEqual(facts.scripts, []);
    assert.equal(manifest.product.description, fixture.summary);
    assertManifestTextIsNormalized(manifest);
    await rm(repo, { recursive: true, force: true });
  }
});

test("validates generated manifests and reports checked assets", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "video-skillkit-"));
  const manifest = await buildVideoBrief("fixtures/product-repo");
  const file = path.join(tmp, "video.json");
  await writeFile(file, JSON.stringify(manifest));

  const report = await validateManifest(file);

  assert.equal(report.ok, true);
  assert.equal(report.checkedAssets, 2);
  await rm(tmp, { recursive: true, force: true });
});

test("fails validation when an asset is missing", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "video-skillkit-"));
  const manifest = await buildVideoBrief("fixtures/product-repo");
  manifest.assets.push({ path: "assets/missing.png", purpose: "Broken fixture", required: true });
  const file = path.join(tmp, "video.json");
  await writeFile(file, JSON.stringify(manifest));

  const report = await validateManifest(file);

  assert.equal(report.ok, false);
  assert.match(report.errors.join("\n"), /Missing asset/);
  await rm(tmp, { recursive: true, force: true });
});

function assertManifestTextIsNormalized(manifest) {
  assert.equal(typeof manifest.title, "string");
  assert.equal(typeof manifest.product.name, "string");
  assert.equal(typeof manifest.product.description, "string");
  assert.equal(typeof manifest.script, "string");
  assert.ok(manifest.captions.every((caption) => typeof caption === "string"));
  assert.doesNotMatch(JSON.stringify(manifest), /\[object Object\]|not,text/);
}

test("ignores directories when discovering top-level assets", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "video-skillkit-"));
  await writeFile(path.join(tmp, "package.json"), JSON.stringify({ name: "asset-fixture" }));
  await mkdir(path.join(tmp, "assets", "frames"), { recursive: true });
  await writeFile(path.join(tmp, "assets", "poster.png"), "fixture");

  const manifest = await buildVideoBrief(tmp);

  assert.deepEqual(manifest.assets.map((asset) => asset.path), ["assets/poster.png"]);
  await rm(tmp, { recursive: true, force: true });
});

test("rejects a directory referenced as an asset", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "video-skillkit-"));
  await mkdir(path.join(tmp, "assets", "frames"), { recursive: true });
  const manifest = await buildVideoBrief(tmp);
  manifest.assets = [{ path: "assets/frames", purpose: "Frames", required: true }];
  const file = path.join(tmp, "video.json");
  await writeFile(file, JSON.stringify(manifest));

  const report = await validateManifest(file);

  assert.equal(report.ok, false);
  assert.deepEqual(report.errors, ["Missing asset: assets/frames"]);
  assert.equal(report.checkedAssets, 1);
  await rm(tmp, { recursive: true, force: true });
});

test("reports a non-array assets value without throwing", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "video-skillkit-"));
  const manifest = await buildVideoBrief("fixtures/product-repo");
  manifest.assets = { path: "assets/logo.txt" };
  const file = path.join(tmp, "video.json");
  await writeFile(file, JSON.stringify(manifest));

  const report = await validateManifest(file);

  assert.equal(report.ok, false);
  assert.deepEqual(report.errors, ["assets must be an array"]);
  assert.equal(report.checkedAssets, 0);
  await rm(tmp, { recursive: true, force: true });
});

test("reports malformed asset entries without throwing", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "video-skillkit-"));
  const manifest = await buildVideoBrief("fixtures/product-repo");
  manifest.assets = [null, "assets/logo.txt", {}, { path: "" }];
  const file = path.join(tmp, "video.json");
  await writeFile(file, JSON.stringify(manifest));

  const report = await validateManifest(file);

  assert.equal(report.ok, false);
  assert.deepEqual(report.errors, [
    "Asset at index 0 must be an object",
    "Asset at index 1 must be an object",
    "Asset at index 2 must have a non-empty string path",
    "Asset at index 3 must have a non-empty string path"
  ]);
  assert.equal(report.checkedAssets, 0);
  await rm(tmp, { recursive: true, force: true });
});

test("reports malformed core manifest fields without throwing", async (t) => {
  const cases = [
    ["title", {}, "title must be a non-empty string"],
    ["hook", 42, "hook must be a non-empty string"],
    ["script", true, "script must be a non-empty string"],
    ["repoRoot", [], "repoRoot must be a non-empty string"],
    ["scenes", {}, "At least one scene is required"],
    ["scenes", [null], "Scene at index 0 must be an object"],
    ["safetyNotes", "review claims", "Safety notes are required"],
    ["safetyNotes", [false], "Safety note at index 0 must be a non-empty string"]
  ];

  for (const [field, value, expectedError] of cases) {
    await t.test(`${field} rejects ${JSON.stringify(value)}`, async () => {
      const tmp = await mkdtemp(path.join(os.tmpdir(), "video-skillkit-"));
      const manifest = await buildVideoBrief("fixtures/product-repo");
      manifest.assets = [];
      manifest[field] = value;
      const file = path.join(tmp, "video.json");
      await writeFile(file, JSON.stringify(manifest));

      const report = await validateManifest(file);

      assert.equal(report.ok, false);
      assert.deepEqual(report.errors, [expectedError]);
      assert.equal(report.checkedAssets, 0);
      await rm(tmp, { recursive: true, force: true });
    });
  }
});

test("rejects assets in sibling directories with a shared path prefix", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "video-skillkit-"));
  const repoRoot = path.join(tmp, "repo");
  const siblingAsset = path.join(tmp, "repo-private", "secret.png");
  const manifest = {
    schemaVersion: "video-skillkit.v1",
    repoRoot,
    title: "Containment test",
    hook: "Verify local assets",
    script: "Validate assets before production.",
    scenes: [{ id: "scene-1" }],
    safetyNotes: ["Keep assets inside the repository."],
    assets: [{ path: siblingAsset }]
  };
  const file = path.join(tmp, "video.json");
  await writeFile(file, JSON.stringify(manifest));

  const report = await validateManifest(file);

  assert.equal(report.ok, false);
  assert.match(report.errors.join("\n"), /Asset escapes repo root/);
  await rm(tmp, { recursive: true, force: true });
});
