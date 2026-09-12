import { test, expect } from '@playwright/test';
import { setupErrorInterceptors } from './helpers/auth';

test.use({ storageState: 'tests/runtime/.auth/participant.json' });

const participantRoutes = [
  { path: '/dashboard', name: 'participant-home' },
  { path: '/dashboard/team', name: 'participant-team' },
  { path: '/dashboard/submissions', name: 'participant-submission' },
  { path: '/dashboard/resources', name: 'participant-resources' },
  { path: '/dashboard/pass', name: 'participant-pass' },
  { path: '/dashboard/certificates', name: 'participant-certificates' },
  { path: '/dashboard/profile', name: 'participant-profile' },
  { path: '/dashboard/orders', name: 'participant-orders' },
];

test.describe('Participant Routes', () => {
  let errors: any[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    setupErrorInterceptors(page, errors);
  });

  test.afterEach(async ({ page }) => {
    expect(errors.length).toBe(0);
  });

  for (const route of participantRoutes) {
    test(`Participant Route: ${route.name} should load cleanly`, async ({ page }) => {
      await page.goto(route.path);
      
      await page.screenshot({ path: `runtime-report/screenshots/${route.name}.png` });
    });
  }
});
