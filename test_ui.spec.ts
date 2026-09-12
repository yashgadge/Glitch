import { test, expect } from '@playwright/test';
import * as path from 'path';

test.use({ storageState: 'tests/runtime/.auth/super_admin.json' });

test('Debug Participant Import', async ({ page }) => {
  // Go to the import page
  await page.goto('http://localhost:5173/admin/participants/import');
  
  // Wait for the page to load
  await page.waitForTimeout(2000);
  
  // Check if we are logged in, if not, wait for it
  const currentUrl = page.url();
  if (currentUrl.includes('/auth/login')) {
    console.log("NOT LOGGED IN! Playwright auth state failed.");
    return;
  }
  
  console.log("Logged in. Uploading file...");
  
  // Upload the file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('mock_participants.xlsx');
  
  // Wait for step 2 to appear
  await page.waitForTimeout(2000);
  
  const validCount = await page.locator('text=Valid Records').locator('..').locator('span.text-2xl').innerText();
  const duplicateCount = await page.locator('text=Duplicates Ignored').locator('..').locator('span.text-2xl').innerText();
  console.log(`Valid: ${validCount}, Duplicates: ${duplicateCount}`);
  
  if (validCount === '0') {
    console.log("All records are duplicates or invalid. This explains the 0 accounts!");
    return;
  }
  
  // Click Provision
  console.log("Clicking Provision...");
  await page.click('button:has-text("PROVISION")');
  
  // Wait for step 4 to appear
  console.log("Waiting for provisioning to finish...");
  await page.waitForSelector('text=Import Complete', { timeout: 30000 });
  
  // Get results
  const successText = await page.locator('text=Successfully created').innerText();
  console.log(`Result: ${successText}`);
  
  // If we can get the errors, let's try
  // Unfortunately the UI in Step 4 doesn't show the errors on screen, it just says "download this file".
  // Let's intercept the download!
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("EXPORT TO EXCEL")')
  ]);
  
  const downloadPath = await download.path();
  console.log("Downloaded error CSV to:", downloadPath);
  
  const fs = require('fs');
  const content = fs.readFileSync(downloadPath, 'utf8');
  console.log("CSV CONTENT:");
  console.log(content);
});
