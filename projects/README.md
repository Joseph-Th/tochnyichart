# Projects

This is the production entrypoint for local chart work.

For a new project, create only:

```text
projects/<project-id>/input/
```

Put the source files in `input/`, then run:

```bash
npm run run:init -- <project-id>
```

The workflow creates and maintains the rest of the project folder:

```text
projects/<project-id>/
├── input/
├── source-ledger.json
├── project.json
├── specs/
├── output/
└── work/
```

Project folders are local and ignored by Git. `work/` is disposable; the other
project contents remain together until you delete the project.
