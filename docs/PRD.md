# PRD: video-skillkit

## Problem

Agents can generate vague video prompts quickly, but product videos need grounded briefs, reusable scene plans, and local asset checks before any rendering tool is called.

## Goals

- Generate a concise product video brief from local repo facts.
- Produce a structured handoff manifest for downstream video tools.
- Validate that referenced local assets exist and stay inside the repo root.
- Keep all V1 behavior local and reviewable.

## Non-Goals

- Rendering final videos.
- Uploading media.
- Posting to social networks.
- Voice cloning, likeness handling, or paid API integration.

## Users

- Agent builders preparing product demos.
- OSS maintainers creating launch material.
- Developer advocates turning repo changes into short videos.

## MVP

The MVP ships a Node CLI with `brief` and `validate` commands, fixture-backed tests, a smoke command, safety notes, and skill instructions.

## Success Criteria

- Fixture repo produces deterministic `video.json` and `brief.md`.
- Missing assets fail validation.
- Another agent can run the quickstart locally without external accounts.
