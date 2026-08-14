import { defineConfig } from 'tsdown'

/**
 * Bundle-package build: bundle the CLI bin (with its shebang) and the thin
 * type-only index. The Host/Client halves are separate packages and build
 * independently; this package only assembles them via `cordis.patch.yml`.
 */
export default defineConfig({
  entry: {
    index: 'lib/types/index.js',
    cli: 'lib/types/cli.js',
  },
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  shims: false,
})
