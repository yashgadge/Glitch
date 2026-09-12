import { test, expect } from '@playwright/test';
import { setupErrorInterceptors } from './helpers/auth';

test.use({ storageState: 'tests/runtime/.auth/judge.json' });

const judgeRoutes = [
  { path: '/workspace', name: 'judge-home' },
  { path: '/workspace/teams', name: 'judge-teams' },
  { path: '/workspace/evaluation', name: 'judge-evaluation' },
  { path: '/workspace/announcements', name: 'judge-announcements' },
  { path: '/workspace/profile', name: 'judge-profile' },
];

test.describe('Judge Routes', () => {
  let errors: any[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    setupErrorInterceptors(page, errors);
  });

  test.afterEach(async ({ page }) => {
    expect(errors.length).toBe(0);
  });

  for (const route of judgeRoutes) {
    test(`Judge Route: ${route.name} should load cleanly`, async ({ page }) => {
      await page.goto(route.path);
      
      await page.screenshot({ path: `runtime-report/screenshots/${route.name}.png` });
    });
  }
});
