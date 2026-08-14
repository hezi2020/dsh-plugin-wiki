# AGENTS.md

Standing orders for this repository. The product contract lives in [README.md](README.md); these rules govern how the repo is changed.

## Layout

- `src/` — TypeScript source. `src/index.ts` is the host plugin; `src/client/` is the browser half (settings section + Monaco editor); `src/shared/` is pure code both halves bundle; `src/executor-worker.ts` is the Node worker running one tool body.
- `scripts/` — the build pipeline (plain-Node `.mjs`): `build-workers.mjs` (executor + Monaco workers), `gen-worker-sources.mjs` (inlines worker IIFE sources), `bundle.mjs` (published bundles), `build.mjs` (orchestrator), `clean.mjs`.
- `lib/` — committed build artifacts. The harness profile resolves `main` and `./client` from here; **every source change that should be installable must rebuild and commit `lib/` in the same commit**.
- `tests/` — vitest suites at the repo root, importing internals by relative path.

## Build and checks

- `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run build` — all four must be green before a commit claims completion; `pnpm run check` runs them in order.
- `pnpm run test` builds the workers first (`pretest`); the executor tests drive the real worker thread.
- The generated file `src/client/monaco/workers.generated.ts` is rewritten by `scripts/gen-worker-sources.mjs`. Never hand-edit it; regenerate with the same pinned `monaco-editor` and the diff must be empty.

## Commit discipline

- Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `build:`, `chore:`) with a body explaining what and why for non-trivial changes.
- One concern per commit: host behavior, client UI, build tooling, docs, and test fixes land separately.
- Never commit credentials, `node_modules/`, or logs.

## Integration

- The plugin mounts into a dsh profile via `dsh plugin --profile <name> add file:/path/to/dsh-custom-tool` (bundle route). Its `dsh.bundle.patch` inserts one row; the profile's healed `node_modules` resolves the bare name.
- Host plugin-set changes take effect on server restart; client bundle changes are served from `lib/client.js` after a rebuild (page refresh).
- The harness checkout that feeds type checking is the sibling `../dsh` (linked devDependencies). When that checkout moves to a new snapshot, re-run `pnpm install`, `pnpm run check`, and fix API drift before integrating.
