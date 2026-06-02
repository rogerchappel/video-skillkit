#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildVideoBrief } from "../src/brief.js";
import { validateManifest } from "../src/validate.js";

const args = process.argv.slice(2);

function readOption(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function usage() {
  return `Usage:
  video-skillkit brief <repo> --out <dir>
  video-skillkit validate <video.json>
`;
}

async function main() {
  const command = args[0];
  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(usage());
    return;
  }

  if (command === "brief") {
    const repo = args[1];
    if (!repo) throw new Error("Missing repo path.");
    const outDir = readOption("--out", "video-plan");
    const manifest = await buildVideoBrief(repo);
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "video.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(path.join(outDir, "brief.md"), renderMarkdown(manifest));
    process.stdout.write(`Wrote ${path.join(outDir, "video.json")}\n`);
    return;
  }

  if (command === "validate") {
    const file = args[1];
    if (!file) throw new Error("Missing manifest path.");
    const report = await validateManifest(file);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.ok) process.exitCode = 1;
    return;
  }

  throw new Error(`Unknown command: ${command}\n${usage()}`);
}

function renderMarkdown(manifest) {
  const scenes = manifest.scenes.map((scene) => `- ${scene.id}: ${scene.visual} | ${scene.voiceover}`).join("\n");
  const assets = manifest.assets.map((asset) => `- ${asset.path}: ${asset.purpose}`).join("\n");
  return `# ${manifest.title}

## Hook
${manifest.hook}

## Script
${manifest.script}

## Scenes
${scenes}

## Asset Checklist
${assets}

## Captions
${manifest.captions.map((caption) => `- ${caption}`).join("\n")}

## Safety Notes
${manifest.safetyNotes.map((note) => `- ${note}`).join("\n")}
`;
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
