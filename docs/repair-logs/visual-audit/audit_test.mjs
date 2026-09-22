import { chromium } from '@playwright/test';

async function run() {
  const browser = await chromium.launch();
  console.log('Chromium launched successfully');
  await browser.close();
}

run().catch(console.error);
