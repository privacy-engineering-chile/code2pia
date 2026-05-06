## Summary

Describe the change.

## Type of Change

- [ ] Language adapter
- [ ] Detector or core scan logic
- [ ] Jurisdiction pack
- [ ] Output format
- [ ] Documentation
- [ ] Tests / fixtures
- [ ] Maintenance

## Checklist

- [ ] I added or updated tests.
- [ ] Findings remain evidence-first.
- [ ] Privacy detection logic remains language-agnostic.
- [ ] Jurisdiction-specific logic stays inside jurisdiction packs.
- [ ] Examples use synthetic or redacted data only.
- [ ] Documentation was updated if behavior changed.

## Validation

```bash
npm run typecheck
npm test
npm run build
```
