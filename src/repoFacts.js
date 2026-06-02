import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const TEXT_FILES = new Set(["README.md", "package.json", "CHANGELOG.md"]);

export async function collectRepoFacts(repoDir) {
  const root = path.resolve(repoDir);
  const entries = await readdir(root, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
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
    if (!TEXT_FILES.has(file)) continue;
    const content = await readFile(path.join(root, file), "utf8");
    if (file === "README.md") {
      facts.summary = extractReadmeSummary(content);
    }
    if (file === "package.json") {
      const packageJson = JSON.parse(content);
      facts.packageName = packageJson.name ?? facts.name;
      facts.packageDescription = packageJson.description ?? null;
      facts.scripts = Object.keys(packageJson.scripts ?? {});
    }
  }

  const assetDir = path.join(root, "assets");
  if (dirs.includes("assets") && (await isDirectory(assetDir))) {
    facts.assets = (await readdir(assetDir))
      .filter((file) => !file.startsWith("."))
      .map((file) => `assets/${file}`);
  }

  return facts;
}

function extractReadmeSummary(readme) {
  return readme
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#")) ?? "";
}

async function isDirectory(target) {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}
