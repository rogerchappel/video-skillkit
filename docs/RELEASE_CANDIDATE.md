# Release Candidate Notes

## Classification

ship

## Verification

Run:

```bash
npm test
npm run check
npm run build
npm run smoke
bash scripts/validate.sh
```

## Known Limits

- No media rendering.
- Minimal repo inspection in V1.
- Asset purpose inference is heuristic.
