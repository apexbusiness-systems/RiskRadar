import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: ['./src/tests/setup/global-setup.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
  }
})
