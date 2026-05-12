import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    globals: true,
    setupFiles: ['src/__tests__/setup.ts'],
    testTimeout: 30000,
  },
})
