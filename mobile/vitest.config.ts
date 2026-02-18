import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['src/lib/**/*.test.ts', 'src/hooks/**/*.test.ts', 'src/contexts/**/*.test.ts'],
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup-vitest.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
