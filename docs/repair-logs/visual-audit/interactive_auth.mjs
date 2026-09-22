import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const AUDIT_DIR = 'F:\\GLITCH36_FRONTEND_REPAIR_WORKSPACE\\visual-audit';
if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR, { recursive: true });
const storageStatePath = path.join(AUDIT_DIR, 'admin_auth_state.json');

async function login() {
  console.log("Launching visible browser for manual authentication...");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log("Navigating to https://admin-glitch-36.web.app/login");
  await page.goto('https://admin-glitch-36.web.app/login');
  
  console.log("WAITING FOR MANUAL LOGIN...");
  console.log("Please log in using your authorized credentials in the Chromium window.");
  console.log("The script will automatically detect when you reach the /workspace dashboard.");
  
  // Wait indefinitely until the URL indicates a successful login to the workspace
  await page.waitForURL('**/workspace*', { timeout: 0 });
  
  console.log("Login detected! Saving authentication state...");
  await context.storageState({ path: storageStatePath });
  
  console.log(`State saved successfully to ${storageStatePath}`);
  await browser.close();
}

login().catch(console.error);
