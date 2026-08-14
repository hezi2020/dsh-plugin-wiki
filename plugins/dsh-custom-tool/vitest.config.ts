import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Node-env test aliases: the client runtime resolves to SOURCE (its published
 * /client bundle is the browser module-loader format), and monaco resolves to
 * a node-safe mock.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: [
      {
        find: /^@deepseek-ai\/dsh-client-runtime\/client$/,
        replacement: fileURLToPath(new URL('../dsh/packages/client/runtime/src/client/index.ts', import.meta.url)),
      },
      {
        find: 'monaco-editor',
        replacement: fileURLToPath(new URL('./tests/mocks/monaco.ts', import.meta.url)),
      },
    ],
  },
})
