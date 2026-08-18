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

## T-0002 - Harden run roots against filesystem indirection

- Area: workspace-filesystem-boundary
- Next: Harden writable/destructive run-workspace and delivery roots against symlink/junction/reparse-point escape. The current projectPath/workspacePath/runSpecPath/deliveryPath checks reject textual traversal with path.resolve, but existing .work, specs/runs, charts, or other owned path components can redirect mkdir/write/copy/publication outside the selected project's real filesystem root. Establish the real project-root authority once, reject or safely handle indirection on owned writable/destructive path components before mutation, and preserve explicitly selected source/input semantics. Cleanup must remove only owned links/artifacts and must never recurse into an external target reached through indirection. Add focused cross-platform tests where feasible (including Windows junction semantics or an owned filesystem-metadata seam) proving textual traversal and filesystem-indirection escape both fail closed before staging/publication/cleanup. Coordinate with T-0001 because publication tests share tests/run-workspace.test.js.
- Paths: `renderer/run-workspace.js`, `renderer/run-charts.js`, `tests/run-workspace.test.js`, `AGENTS.md`
- Verify: `node --test tests/run-workspace.test.js && npm test`
- Depends: T-0001
- Basis: `d37790b8cab060c6b23953e5f7fd1ca39fd92d33`
- Reviewed: `2026-08-18T07:05:02Z`
