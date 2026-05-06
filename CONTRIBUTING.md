# Contributing to code2pia

Thanks for helping build Privacy as Code tooling.

code2pia is designed as an open-source project from day one. The project values transparent heuristics, readable code, practical privacy engineering, and respectful collaboration across engineering, legal, privacy, and security disciplines.

## Development Setup

```bash
npm install
npm test
npm run typecheck
npm run build
```

## Contribution Guidelines

- Keep detectors transparent and explainable.
- Prefer small, focused pull requests.
- Add or update tests for detector and scoring behavior.
- Avoid presenting automated output as legal advice.
- Document new heuristics and known limitations.
- Preserve the CLI's developer-first ergonomics.

## Detector Contributions

When adding a detector:

1. Add the detector under `src/detectors/`.
2. Implement the `Detector` interface.
3. Add focused tests under `tests/`.
4. Register the detector in `src/core/scanner.ts`.
5. Update README documentation if the behavior is user-visible.

## Privacy and Safety

Do not add telemetry, cloud calls, or hidden network behavior. code2pia should be usable locally by default and safe to run on sensitive repositories.

## Reporting Issues

Please include:

- code2pia version or commit
- Node.js version
- Command used
- Minimal reproduction or sample code
- Expected and actual behavior

## Pull Request Checklist

- Tests pass with `npm test`.
- Type checking passes with `npm run typecheck`.
- New behavior is documented.
- Output language still includes the human legal/privacy review disclaimer where relevant.
