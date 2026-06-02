# video-skillkit Skill

## When To Use

Use this skill when an agent needs to prepare a product demo, launch clip, or short-form video plan from local repo evidence.

## Required Inputs

- A local repository path.
- Optional local assets under `assets/`.
- A destination directory for generated planning files.

## Side-Effect Boundaries

The skill only reads local files and writes local Markdown/JSON outputs. It does not render media, upload assets, call video APIs, or post to social platforms.

## Approval Requirements

Ask for explicit approval before using any downstream media-generation, voice, likeness, upload, or social-posting tool.

## Workflow

```bash
video-skillkit brief ./repo --out video-plan
video-skillkit validate video-plan/video.json
```

Review the generated `brief.md`, confirm claims are backed by local evidence, then pass `video.json` to a separate rendering workflow only after approval.

## Validation

Run `npm test`, `npm run check`, and `npm run smoke` before publishing updates. Validation fails on missing assets and warns on over-strong promotional claims.
