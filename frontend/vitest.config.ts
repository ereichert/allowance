import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // tests/e2e is Playwright's tree (its own test()/expect from
    // @playwright/test, run via `just test-e2e`), not vitest's.
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
  },
})
