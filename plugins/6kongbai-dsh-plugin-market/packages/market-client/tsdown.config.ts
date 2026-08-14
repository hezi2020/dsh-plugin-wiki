import { defineConfig } from 'tsdown'

/**
 * Client-half bundle. The dsh web runtime loads browser plugins through
 * `window.__ModuleLoader__.load({ id, factory })` and resolves platform
 * modules (cordis DI entities, react, and the `@deepseek-ai/dsh-client-*`
 * seed) from the loader module table — they MUST stay external. Everything
 * else (this panel, the generated `/remote` contribution, zod) inlines.
 *
 * NOTE: the upstream harness ships a richer preset (packages/client/
 * tsdown.client.ts) that also inlines `.module.css` via lightningcss and
 * enforces a client-bundle purity gate. This config is the minimal equivalent;
 * port the upstream preset if the panel grows CSS Modules or cross-plugin
 * value imports.
 */
export default defineConfig({
  entry: { client: 'lib/types/client/index.js' },
  outDir: 'lib',
  format: ['cjs'],
  platform: 'browser',
  target: 'es2024',
  dts: false,
  clean: false,
  sourcemap: true,
  external: ['react', 'react-dom', /^@deepseek-ai\/dsh-client-/, /^@deepseek-ai\/cordis/],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: "dsh-plugin-market-client", factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
})
