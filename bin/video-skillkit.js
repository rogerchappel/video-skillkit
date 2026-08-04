#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildVideoBrief } from "../src/brief.js";
import { validateManifest } from "../src/validate.js";

const args = process.argv.slice(2);

function usage() {
  return `Usage:
  video-skillkit brief <repo> --out <dir>
  video-skillkit validate <video.json>
`;
}

function usageError(message) {
  return new Error(`${message}\n\n${usage()}`);
}

function parseBriefArgs(commandArgs) {
  if (commandArgs.length === 0) {
    throw usageError("Missing repo path.");
  }
  if (commandArgs[0].startsWith("-")) {
    throw usageError(`Unknown option: ${commandArgs[0]}`);
  }

  const repo = commandArgs[0];
  let outDir = "video-plan";
  let hasOutDir = false;

  for (let index = 1; index < commandArgs.length; index += 1) {
    const argument = commandArgs[index];
    if (argument !== "--out") {
      throw usageError(argument.startsWith("-") ? `Unknown option: ${argument}` : `Unexpected argument: ${argument}`);
    }
    if (hasOutDir) {
      throw usageError("Duplicate option: --out");
    }
    if (index + 1 >= commandArgs.length || commandArgs[index + 1].startsWith("-")) {
      throw usageError("Missing value for --out.");
    }
    outDir = commandArgs[index + 1];
    hasOutDir = true;
    index += 1;
  }

  return { repo, outDir };
}

function parseValidateArgs(commandArgs) {
  if (commandArgs.length === 0) {
    throw usageError("Missing manifest path.");
  }
  if (commandArgs[0].startsWith("-")) {
    throw usageError(`Unknown option: ${commandArgs[0]}`);
  }
  if (commandArgs.length > 1) {
    const argument = commandArgs[1];
    throw usageError(argument.startsWith("-") ? `Unknown option: ${argument}` : `Unexpected argument: ${argument}`);
  }
  return { file: commandArgs[0] };
}

async function main() {
  const command = args[0];
  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(usage());
    return;
  }

  if (command === "brief") {
    const { repo, outDir } = parseBriefArgs(args.slice(1));
    const manifest = await buildVideoBrief(repo);
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "video.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(path.join(outDir, "brief.md"), renderMarkdown(manifest));
    process.stdout.write(`Wrote ${path.join(outDir, "video.json")}\n`);
    return;
  }

  if (command === "validate") {
    const { file } = parseValidateArgs(args.slice(1));
    const report = await validateManifest(file);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.ok) process.exitCode = 1;
    return;
  }

  throw usageError(`Unknown command: ${command}`);
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
