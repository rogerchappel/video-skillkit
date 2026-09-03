import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const TEXT_FILES = new Set(["package.json", "CHANGELOG.md"]);

export async function collectRepoFacts(repoDir) {
  const root = path.resolve(repoDir);
  const entries = await readdir(root, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const readmeFile = findReadme(files);
  const facts = {
    root,
    name: path.basename(root),
    summary: "",
    packageName: null,
    packageDescription: null,
    scripts: [],
    files,
    assets: []
  };

  for (const file of files) {
    if (!TEXT_FILES.has(file) && file !== readmeFile) continue;
    const content = await readFile(path.join(root, file), "utf8");
    if (file === readmeFile) {
      facts.summary = extractReadmeSummary(content);
    }
    if (file === "package.json") {
      const packageJson = parseOptionalPackageJson(content);
      const metadata = isObject(packageJson) ? packageJson : {};
      facts.packageName = normalizedString(metadata.name) ?? facts.name;
      facts.packageDescription = normalizedString(metadata.description);
      facts.scripts = isObject(metadata.scripts) ? Object.keys(metadata.scripts) : [];
    }
  }

  const assetDir = path.join(root, "assets");
  if (dirs.includes("assets") && (await isDirectory(assetDir))) {
    facts.assets = (await readdir(assetDir, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
      .map((entry) => `assets/${entry.name}`);
  }

  return facts;
}

function parseOptionalPackageJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function normalizedString(value) {
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function findReadme(files) {
  const candidates = files.filter((file) => file.toLowerCase() === "readme.md");
  return candidates.find((file) => file === "README.md")
    ?? candidates.sort((left, right) => left.localeCompare(right))[0]
    ?? null;
}

function extractReadmeSummary(readme) {
  const candidates = readme
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  return candidates.find((line) => !isReadmeChrome(line)) ?? candidates[0] ?? "";
}

function isReadmeChrome(line) {
  if (/^<\/?(?:div|p|picture|a)(?:\s[^>]*)?>$/i.test(line)) return true;
  if (/<(?:img|source)\b/i.test(line)) return true;
  if (/^(?:\[?!?[^\]]*\]\([^)]*\)\s*)+(?:[|·•/-]\s*(?:\[[^\]]+\]\([^)]*\)\s*)+)*$/.test(line)) return true;
  return false;
}

async function isDirectory(target) {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}
