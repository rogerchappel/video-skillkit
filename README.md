# video-skillkit

`video-skillkit` is a local-first agent skill for preparing product demo videos before any rendering tool is used. It reads repo facts, writes a grounded video brief, and validates that referenced assets exist.

## Quickstart

```bash
npm install
npm run smoke
node bin/video-skillkit.js brief fixtures/product-repo --out video-plan
node bin/video-skillkit.js validate video-plan/video.json
```

## CLI

```bash
video-skillkit brief ./repo --out video-plan/
video-skillkit validate video-plan/video.json
```

The `brief` command emits `video.json` for downstream tools and `brief.md` for human review.
Unknown options, extra positional arguments, and `--out` without a value are rejected with usage guidance.

## Examples

- Turn a CLI repo into a three-scene product demo brief.
- Build an asset checklist before calling an AI video generator.
- Validate a saved manifest during release preparation.

## Safety Notes

- The tool does not render video, upload files, or post to external services.
- Generated claims are intentionally conservative and should be reviewed before publication.
- External video generation or posting requires a separate approval step.

## Limitations

- V1 inspects top-level README and package metadata only.
- Asset validation checks local existence, not visual suitability.
- The generated script is a draft, not a final brand review.

## Development

Run the same release gate used by CI before opening a PR:

```bash
npm run release:check
```

The release gate covers:

- `npm run check` - node --check src/*.js && node --check bin/video-skillkit.js
- `npm run build` - npm run check
- `npm test` - node --test
- `npm run smoke` - node bin/video-skillkit.js brief fixtures/product-repo --out .tmp/smoke && node bin/video-skillkit.js validate .tmp/smoke/video.json
- `npm run package:smoke` - pack the publishable artifact, install it in a clean temporary project, and run the packaged CLI against its bundled fixture
- `npm run release:check` - npm test && npm run check && npm run smoke && npm run package:smoke

The fixture under `fixtures/product-repo` is intentionally included in the npm
package so the artifact itself can be verified without repository-only files.
