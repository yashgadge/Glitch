import { test, expect } from '@playwright/test';
import { setupErrorInterceptors } from './helpers/auth';

test.use({ storageState: 'tests/runtime/.auth/super_admin.json' });

const adminRoutes = [
  { path: '/workspace', name: 'admin-dashboard' },
  { path: '/workspace/participants', name: 'participants' },
  { path: '/workspace/import', name: 'import' },
  { path: '/workspace/staff', name: 'staff' },
  { path: '/workspace/classrooms', name: 'classrooms' },
  { path: '/workspace/results', name: 'results' },
  { path: '/workspace/evaluation', name: 'evaluations' },
  { path: '/workspace/submissions', name: 'submission-manager' },
  { path: '/workspace/engine', name: 'submission-settings' },
  { path: '/workspace/communication', name: 'communications' },
  { path: '/workspace/certificates', name: 'certificates' },
  { path: '/workspace/digital-pass', name: 'digital-passes' },
  { path: '/workspace/activity', name: 'audit-log' },
];

test.describe('Admin Routes', () => {
  let errors: any[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    setupErrorInterceptors(page, errors);
  });

  test.afterEach(async ({ page }) => {
    if (errors.length > 0) {
      console.log('Errors detected:', errors);
    }
    expect(errors.length).toBe(0);
  });

  for (const route of adminRoutes) {
    test(`Admin Route: ${route.name} should load cleanly`, async ({ page }) => {
      await page.goto(route.path);
      
      await page.screenshot({ path: `runtime-report/screenshots/${route.name}.png` });
    });
  }
});
