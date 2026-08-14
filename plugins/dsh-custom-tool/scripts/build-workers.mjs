/**
 * Build the worker artifacts the bundle and the tests consume:
 * - lib/executor-worker.js — the Node worker running one tool body (ESM).
 * - lib/workers/editor-worker.entry.js, lib/workers/ts-worker.entry.js —
 *   the Monaco workers as minified IIFE bundles, inlined by
 *   scripts/gen-worker-sources.mjs into the client bundle.
 */
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))

await build({
  absWorkingDir: root,
  entryPoints: ['src/executor-worker.ts'],
  outfile: 'lib/executor-worker.js',
  format: 'esm',
  platform: 'node',
  bundle: true,
  sourcemap: false,
  target: ['node22'],
  logLevel: 'info',
})

await build({
  absWorkingDir: root,
  entryPoints: ['src/client/monaco/editor-worker.entry.ts', 'src/client/monaco/ts-worker.entry.ts'],
  outdir: 'lib/workers',
  entryNames: '[name]',
  format: 'iife',
  platform: 'browser',
  bundle: true,
  minify: true,
  sourcemap: false,
  target: ['es2022'],
  logLevel: 'info',
})

console.log('dsh-custom-tool: worker bundles built')
