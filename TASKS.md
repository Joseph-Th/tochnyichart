# Tasks

Current executable work that may be picked up asynchronously. Keep entries short; remove completed work. `STATUS.md`/`CAPABILITIES.md` owns implemented truth and `ROADMAP.md`/`DIRECTION.md` owns future direction.

## T-0002 - Compact README authority surface

- Area: documentation
- Next: Refactor README.md back to repository orientation and operator workflow. Preserve the three-role model, primary batch entry sequence, essential commands, minimal examples, requirements, verification entrypoint, and project map; replace duplicated authoring/source/story-selection/ledger rules with precise links to their owning docs. Do not remove a rule from README until its authoritative owner is confirmed to contain the equivalent current contract.
- Paths: `README.md`
- Verify: `npm run test:all && python ../tools/check_standards.py`
- Depends: none
- Basis: `be6d5e8d557b734bfc1295ff3487bccf2aaae315`
- Reviewed: `2026-08-18T02:51:01Z`
