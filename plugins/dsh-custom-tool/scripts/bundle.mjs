/**
 * Bundle the published artifacts:
 * - lib/index.js — the host plugin (ESM; harness packages external, everything
 *   else bundled, including the vendored schemastery).
 * - lib/invariant.js — the invariant companion.
 * - lib/client.js — the browser half in the module-loader factory format, with
 *   monaco (editor core + all languages) and its CSS inlined.
 */
import { build } from 'esbuild'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))

/** Inline every monaco CSS import into a deduped <style> tag. */
const inlineCss = {
  name: 'dsh-custom-tool-inline-css',
  setup(buildApi) {
    buildApi.onLoad({ filter: /\.css$/ }, async (args) => {
      const css = await readFile(args.path, 'utf8')
      return {
        loader: 'js',
        contents: [
          '(function () {',
          '  if (typeof document === "undefined") return',
          `  var id = "dct-monaco-css:" + ${JSON.stringify(args.path)}`,
          '  if (document.getElementById(id)) return',
          '  var style = document.createElement("style")',
          '  style.id = id',
          `  style.textContent = ${JSON.stringify(css)}`,
          '  document.head.appendChild(style)',
          '})()',
        ].join('\n'),
      }
    })
  },
}

const shared = {
  absWorkingDir: root,
  bundle: true,
  logLevel: 'info',
  sourcemap: true,
  target: ['es2022'],
}

const HOST_EXTERNALS = [
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-settings',
  '@deepseek-ai/dsh-tools',
  '@deepseek-ai/dsh-system-prompt',
  '@deepseek-ai/dsh-llm',
]

await build({
  ...shared,
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  format: 'esm',
  platform: 'node',
  external: HOST_EXTERNALS,
})

await build({
  ...shared,
  entryPoints: ['src/invariant.ts'],
  outfile: 'lib/invariant.js',
  format: 'esm',
  platform: 'node',
  external: ['@deepseek-ai/cordis'],
})

await build({
  ...shared,
  entryPoints: ['src/client/index.ts'],
  outfile: 'lib/client.js',
  format: 'cjs',
  platform: 'browser',
  external: ['@deepseek-ai/*', 'react', 'react/jsx-runtime'],
  plugins: [inlineCss],
  banner: {
    js: [
      "window.__ModuleLoader__.load({ id: 'dsh-custom-tool', factory: (require) => {",
      'var module = { exports: {} }; var exports = module.exports;',
    ].join('\n'),
  },
  footer: { js: 'return module.exports; } });' },
  define: { 'process.env.NODE_ENV': '"production"' },
  minify: true,
})

console.log('dsh-custom-tool: bundles built')
