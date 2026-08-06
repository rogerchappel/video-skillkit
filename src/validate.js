import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export async function validateManifest(manifestPath) {
  const absolute = path.resolve(manifestPath);
  const parsed = JSON.parse(await readFile(absolute, "utf8"));
  const errors = [];
  const warnings = [];
  const manifest = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};

  if (manifest !== parsed) {
    errors.push("Manifest must be an object");
  }

  if (manifest.schemaVersion !== "video-skillkit.v1") {
    errors.push("schemaVersion must be video-skillkit.v1");
  }
  for (const field of ["title", "hook", "script", "repoRoot"]) {
    if (typeof manifest[field] !== "string" || manifest[field].trim() === "") {
      errors.push(`${field} must be a non-empty string`);
    }
  }
  if (!Array.isArray(manifest.scenes) || manifest.scenes.length === 0) {
    errors.push("At least one scene is required");
  } else {
    for (const [index, scene] of manifest.scenes.entries()) {
      if (!scene || typeof scene !== "object" || Array.isArray(scene)) {
        errors.push(`Scene at index ${index} must be an object`);
      }
    }
  }
  if (!Array.isArray(manifest.safetyNotes) || manifest.safetyNotes.length === 0) {
    errors.push("Safety notes are required");
  } else {
    for (const [index, note] of manifest.safetyNotes.entries()) {
      if (typeof note !== "string" || note.trim() === "") {
        errors.push(`Safety note at index ${index} must be a non-empty string`);
      }
    }
  }

  const repoRoot = typeof manifest.repoRoot === "string" && manifest.repoRoot.trim() !== ""
    ? path.resolve(manifest.repoRoot)
    : path.dirname(absolute);
  const assets = manifest.assets === undefined ? [] : manifest.assets;
  if (!Array.isArray(assets)) {
    errors.push("assets must be an array");
  }

  let checkedAssets = 0;
  for (const [index, asset] of (Array.isArray(assets) ? assets : []).entries()) {
    if (!asset || typeof asset !== "object" || Array.isArray(asset)) {
      errors.push(`Asset at index ${index} must be an object`);
      continue;
    }
    if (typeof asset.path !== "string" || asset.path.trim() === "") {
      errors.push(`Asset at index ${index} must have a non-empty string path`);
      continue;
    }

    checkedAssets += 1;
    const assetPath = path.resolve(repoRoot, asset.path);
    const relativeAssetPath = path.relative(repoRoot, assetPath);
    if (relativeAssetPath === ".." || relativeAssetPath.startsWith(`..${path.sep}`) || path.isAbsolute(relativeAssetPath)) {
      errors.push(`Asset escapes repo root: ${asset.path}`);
      continue;
    }
    if (!(await isFile(assetPath))) {
      errors.push(`Missing asset: ${asset.path}`);
    }
  }

  if (typeof manifest.script === "string" && manifest.script.match(/\b(best|only|guaranteed|10x|#1)\b/i)) {
    warnings.push("Script contains promotional claims that need evidence review");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    checkedAssets
  };
}

async function isFile(target) {
  try {
    return (await stat(target)).isFile();
  } catch {
    return false;
  }
}
