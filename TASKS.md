# Tasks

Current executable work that may be picked up asynchronously. Keep entries short; remove completed work. `STATUS.md`/`CAPABILITIES.md` owns implemented truth and `ROADMAP.md`/`DIRECTION.md` owns future direction.

## T-0001 - Add documentation integrity check

- Area: documentation
- Next: Add a repository-owned documentation integrity check alongside existing repository hygiene. Protect the 15-document authority surface with local-link resolution, required authority pages, documented npm/Tool API entrypoints, and concrete repository routes where mechanically decidable; integrate it into test:all without duplicating editorial or visual review.
- Paths: `docs/testing.md`
- Verify: `npm run test:all && python ../tools/check_standards.py`
- Depends: none
- Basis: `3a2ee98a62a85dcc551f9b7de0823a0f7b21e3e6`
- Reviewed: `2026-08-18T02:48:25Z`
