# Orchestration

## Agent Routine

1. Run `video-skillkit brief <repo> --out <dir>`.
2. Read `<dir>/brief.md` and check that the script does not overclaim.
3. Run `video-skillkit validate <dir>/video.json`.
4. Use the manifest as input to a separate approved video-rendering workflow.

## Boundaries

- Local reads: repo README, package metadata, top-level assets.
- Local writes: generated plan directory.
- External actions: none in this package.

## Failure Handling

- Missing assets block downstream production.
- Promotional warnings require human or agent review before publishing.
- Invalid schema versions should be regenerated with the current CLI.
