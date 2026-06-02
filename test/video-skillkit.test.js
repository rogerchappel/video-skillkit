import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildVideoBrief } from "../src/brief.js";
import { validateManifest } from "../src/validate.js";

test("builds a grounded video manifest from fixture repo facts", async () => {
  const manifest = await buildVideoBrief("fixtures/product-repo");

  assert.equal(manifest.schemaVersion, "video-skillkit.v1");
  assert.equal(manifest.product.name, "fixture-cli");
  assert.ok(manifest.product.evidence.includes("README.md"));
  assert.equal(manifest.assets.length, 2);
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
