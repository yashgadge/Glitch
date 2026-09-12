import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  globalSetup: './tests/runtime/global.setup.ts',
  testDir: './tests/runtime',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Keep sequential to trace accurately
  reporter: [
    ['list'],
    ['json', { outputFile: 'playwright-report/results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],
  webServer: {
    command: 'npx concurrently "npm run dev" "npx firebase emulators:start --only auth,firestore,storage --project glitch-36 --non-interactive"',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      VITE_USE_EMULATOR: 'true',
      CI: 'true'
    }
  },
});
