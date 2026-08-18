# Tasks

Current executable work that may be picked up asynchronously. Keep entries short; remove completed work. `STATUS.md`/`CAPABILITIES.md` owns implemented truth and `ROADMAP.md`/`DIRECTION.md` owns future direction.

## T-0001 - Separate publication commit from cleanup

- Area: artifact-publication
- Next: Refactor renderer/run-charts.js so the staging-to-final rename is the publication commit point. A backup-cleanup failure after that rename must preserve the newly published delivery and surface a structured committed-with-maintenance-warning result instead of deleting/reverting it or reporting an unqualified failure. Preserve pre-commit rollback behavior, stale downstream-artifact invalidation, and unrelated delivery files. Add deterministic tests for both a pre-commit publication failure and a post-commit backup-cleanup failure.
- Paths: `renderer/run-charts.js`, `tests/run-workspace.test.js`
- Verify: `node --test tests/run-workspace.test.js && npm test`
- Depends: none
- Basis: `38d8440e3f7a3010be2540d3f167baf780837bc6`
- Reviewed: `2026-08-18T06:03:42Z`
