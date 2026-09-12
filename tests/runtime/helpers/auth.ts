import { Page, expect } from '@playwright/test';

export async function loginAsAdmin(page: Page) {
  // Use dummy credentials since the user has not provided real ones yet.
  const email = process.env.TEST_ADMIN_EMAIL || 'admin@glitch36.com';
  const password = process.env.TEST_ADMIN_PASSWORD || 'adminpassword';
  await login(page, email, password);
}

export async function loginAsJudge(page: Page) {
  const email = process.env.TEST_JUDGE_EMAIL || 'judge@glitch36.com';
  const password = process.env.TEST_JUDGE_PASSWORD || 'judgepassword';
  await login(page, email, password);
}

export async function loginAsVolunteer(page: Page) {
  const email = process.env.TEST_VOLUNTEER_EMAIL || 'volunteer@glitch36.com';
  const password = process.env.TEST_VOLUNTEER_PASSWORD || 'volunteerpassword';
  await login(page, email, password);
}

export async function loginAsParticipant(page: Page) {
  const email = process.env.TEST_PARTICIPANT_EMAIL || 'participant@glitch36.com';
  const password = process.env.TEST_PARTICIPANT_PASSWORD || 'participantpassword';
  await login(page, email, password);
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  
  // Fill the login form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  
  // Submit the form
  await page.click('button[type="submit"]');
  
  // Wait for navigation away from login
  await page.waitForURL('**/workspace**', { timeout: 10000 });
}

export function setupErrorInterceptors(page: Page, errors: any[]) {
  page.on('pageerror', exception => {
    errors.push({ type: 'pageerror', error: exception.message, stack: exception.stack });
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({ type: 'console.error', text: msg.text() });
    }
  });

  page.on('requestfailed', request => {
    errors.push({ type: 'requestfailed', url: request.url(), errorText: request.failure()?.errorText });
  });
}
