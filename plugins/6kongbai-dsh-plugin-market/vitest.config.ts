import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/plugin-market/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/plugin-market/src/**/*.ts'],
    },
  },
})
