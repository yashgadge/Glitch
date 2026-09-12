import { test, expect } from '@playwright/test';
import { setupErrorInterceptors } from './helpers/auth';

test.describe('Public Routes', () => {
  let errors: any[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    setupErrorInterceptors(page, errors);
  });

  test.afterEach(async ({ page }) => {
    expect(errors).toEqual([]); // Fail test if there are any console or network errors
  });

  test('Landing Page should load cleanly', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=GLITCH 36')).toBeVisible();
    await page.screenshot({ path: 'runtime-report/screenshots/landing.png' });
  });

  test('Login Page should load cleanly', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await page.screenshot({ path: 'runtime-report/screenshots/login.png' });
  });

  test('Forgot Password Page should load cleanly', async ({ page }) => {
    await page.goto('/forgot-password');
    
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await page.screenshot({ path: 'runtime-report/screenshots/forgot-password.png' });
  });
});
