import { test, expect } from '@playwright/test';
import { setupErrorInterceptors } from './helpers/auth';

test.use({ storageState: 'tests/runtime/.auth/volunteer.json' });

const volunteerRoutes = [
  { path: '/workspace', name: 'volunteer-home' },
  { path: '/workspace/scanner', name: 'volunteer-scanner' },
  { path: '/workspace/search', name: 'volunteer-search' },
  { path: '/workspace/classroom', name: 'volunteer-classroom' },
  { path: '/workspace/announcements', name: 'volunteer-announcements' },
  { path: '/workspace/profile', name: 'volunteer-profile' },
];

test.describe('Volunteer Routes', () => {
  let errors: any[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    setupErrorInterceptors(page, errors);
  });

  test.afterEach(async ({ page }) => {
    expect(errors.length).toBe(0);
  });

  for (const route of volunteerRoutes) {
    test(`Volunteer Route: ${route.name} should load cleanly`, async ({ page }) => {
      await page.goto(route.path);
      
      await page.screenshot({ path: `runtime-report/screenshots/${route.name}.png` });
    });
  }
});
