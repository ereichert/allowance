import { defineConfig, devices } from '@playwright/test'

// https://playwright.dev/docs/test-configuration
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]],
  use: {
    // Compose-network hostname — the browser this launches runs inside the
    // dev container, where localhost refers to the dev container itself, not
    // the frontend service. See docs/design-decisions.md.
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://frontend:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Chromium only: matches the single browser baked into docker/Dockerfile.dev.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
