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

### Manifest validation contract

A V1 manifest is a JSON object with `schemaVersion` set to `video-skillkit.v1`;
non-empty string values for `repoRoot`, `title`, `hook`, and `script`; a non-empty
`scenes` array of objects; and a non-empty `safetyNotes` array of non-empty
strings. `assets` is optional, but when present it must be an array of objects
with non-empty string `path` values.

The `validate` command always prints a JSON report for a parsed manifest. Invalid
field types are listed deterministically in `errors`, `ok` is `false`, and the
process exits with status 1. `checkedAssets` records how many structurally valid
asset paths were checked, even when other manifest fields are invalid.

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
- Source package metadata is treated as optional input. If `package.json` parses
  to a non-object value, `name` or `description` is not a non-empty string, or
  `scripts` is not an object, the invalid field is ignored. The repository
  directory name supplies the product name, the first non-heading README line
  supplies the description when available, and scripts otherwise default to an
  empty list.
- V1 discovers regular files directly inside `assets/`; nested asset directories are ignored.
- Asset validation requires each manifest asset to have a non-empty string `path`
  that resolves to a regular file. It does not assess visual suitability.
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
