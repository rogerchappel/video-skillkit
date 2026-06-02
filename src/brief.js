import { collectRepoFacts } from "./repoFacts.js";

export async function buildVideoBrief(repoDir) {
  const facts = await collectRepoFacts(repoDir);
  const productName = facts.packageName ?? facts.name;
  const value = (facts.packageDescription ?? facts.summary) || "a local developer tool";
  const assets = facts.assets.map((asset) => ({
    path: asset,
    purpose: inferAssetPurpose(asset),
    required: true
  }));

  return {
    schemaVersion: "video-skillkit.v1",
    repoRoot: facts.root,
    title: `${productName} product demo brief`,
    product: {
      name: productName,
      description: value,
      evidence: facts.files.filter((file) => ["README.md", "package.json"].includes(file))
    },
    hook: `Show how ${productName} turns local project facts into a safer demo plan.`,
    script: [
      `Open on the core problem: teams need grounded video prep before generation.`,
      `Introduce ${productName}: ${value}.`,
      `Walk through the local workflow and the files that back each claim.`,
      `Close with the handoff manifest and validation report.`
    ].join(" "),
    scenes: [
      {
        id: "scene-1",
        visual: "Repository README and package metadata",
        voiceover: `This demo starts from local evidence for ${productName}.`
      },
      {
        id: "scene-2",
        visual: "CLI command and generated manifest",
        voiceover: "The agent prepares the brief before any rendering tool is called."
      },
      {
        id: "scene-3",
        visual: "Validation report with asset checks",
        voiceover: "Missing files and unsupported claims are caught early."
      }
    ],
    assets,
    captions: [
      `${productName}: grounded video prep for agents`,
      "Brief first. Generate later.",
      "Validate assets before production."
    ],
    safetyNotes: [
      "No media is rendered or uploaded by this tool.",
      "All claims should be backed by local README, package, or changelog evidence.",
      "External video generation requires separate explicit approval."
    ]
  };
}

function inferAssetPurpose(assetPath) {
  if (/\b(logo|mark)\b/i.test(assetPath)) return "Brand or product identity";
  if (/\b(screen|demo|shot)\b/i.test(assetPath)) return "Product walkthrough visual";
  return "Supporting visual evidence";
}
