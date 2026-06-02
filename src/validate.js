import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export async function validateManifest(manifestPath) {
  const absolute = path.resolve(manifestPath);
  const manifest = JSON.parse(await readFile(absolute, "utf8"));
  const errors = [];
  const warnings = [];

  if (manifest.schemaVersion !== "video-skillkit.v1") {
    errors.push("schemaVersion must be video-skillkit.v1");
  }
  for (const field of ["title", "hook", "script", "repoRoot"]) {
    if (!manifest[field]) errors.push(`Missing ${field}`);
  }
  if (!Array.isArray(manifest.scenes) || manifest.scenes.length === 0) {
    errors.push("At least one scene is required");
  }
  if (!Array.isArray(manifest.safetyNotes) || manifest.safetyNotes.length === 0) {
    errors.push("Safety notes are required");
  }

  const repoRoot = manifest.repoRoot ? path.resolve(manifest.repoRoot) : path.dirname(absolute);
  for (const asset of manifest.assets ?? []) {
    const assetPath = path.resolve(repoRoot, asset.path);
    if (!assetPath.startsWith(repoRoot)) {
      errors.push(`Asset escapes repo root: ${asset.path}`);
      continue;
    }
    if (!(await exists(assetPath))) {
      errors.push(`Missing asset: ${asset.path}`);
    }
  }

  if ((manifest.script ?? "").match(/\b(best|only|guaranteed|10x|#1)\b/i)) {
    warnings.push("Script contains promotional claims that need evidence review");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    checkedAssets: (manifest.assets ?? []).length
  };
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}
