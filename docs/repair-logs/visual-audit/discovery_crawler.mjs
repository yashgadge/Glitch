import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const AUDIT_DIR = 'F:\\GLITCH36_FRONTEND_REPAIR_WORKSPACE\\visual-audit';
const SCREENSHOTS_DIR = path.join(AUDIT_DIR, 'authenticated_screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const adminStatePath = path.join(AUDIT_DIR, 'admin_auth_state.json');

const ADMIN_ROUTES = [
  '/',
  '/event',
  '/participants',
  '/teams',
  '/staff',
  '/import',
  '/classrooms',
  '/command-center',
  '/evaluation',
  '/results',
  '/digital-pass',
  '/submissions',
  '/engine',
  '/communication',
  '/cms',
  '/certificates',
  '/permissions',
  '/activity'
];

async function crawl() {
  console.log("Launching headless browser with authenticated state...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: adminStatePath });
  const page = await context.newPage();
  
  const featureInventory = [];
  const controlInventory = [];
  
  for (const route of ADMIN_ROUTES) {
    const fullUrl = `https://admin-glitch-36.web.app/workspace${route === '/' ? '' : route}`;
    console.log(`Crawling ${fullUrl}...`);
    
    try {
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000); // Wait for async Firestore data to load
      
      const actualUrl = page.url();
      if (actualUrl.includes('/login')) {
         console.warn(`[WARNING] Redirected to login on ${fullUrl}. State might be invalid or permissions lacking.`);
         continue;
      }
      
      // Capture Screenshot
      const screenshotName = `admin_${route === '/' ? 'home' : route.replace(/\//g, '_')}.png`;
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, screenshotName), fullPage: true });
      
      // Extract basic page details
      const title = await page.title();
      featureInventory.push({
         Website: 'Live Admin',
         FeatureName: route === '/' ? 'Admin Dashboard Home' : route.replace(/\//g, ' ').trim(),
         Route: `/workspace${route === '/' ? '' : route}`,
         NavigationPath: 'Sidebar Menu',
         Screenshot: screenshotName,
         Accessible: 'Yes'
      });
      
      // Extract controls
      const controls = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="tab"], [role="switch"]'));
        return elements.map(el => {
          let text = el.innerText || el.value || el.getAttribute('aria-label') || el.name || 'Unknown';
          text = text.trim().replace(/\n/g, ' ').substring(0, 50);
          return {
            tag: el.tagName.toLowerCase(),
            type: el.type || '',
            role: el.getAttribute('role') || '',
            text: text,
            disabled: el.disabled || el.getAttribute('aria-disabled') === 'true'
          };
        }).filter(c => c.text !== 'Unknown' && c.text !== '');
      });
      
      controls.forEach(c => {
         controlInventory.push({
           Website: 'Live Admin',
           Page: `/workspace${route === '/' ? '' : route}`,
           ControlText: c.text,
           ControlType: `${c.tag}${c.type ? `[type=${c.type}]` : ''}${c.role ? `[role=${c.role}]` : ''}`,
           State: c.disabled ? 'Disabled' : 'Enabled'
         });
      });
      
    } catch (e) {
      console.error(`Failed on ${fullUrl}: ${e.message}`);
    }
  }
  
  await browser.close();
  
  // Save inventories to CSV
  let featureCsv = "Website,Feature Name,Route,Navigation Path,Screenshot,Accessible\n";
  featureInventory.forEach(f => {
    featureCsv += `"${f.Website}","${f.FeatureName}","${f.Route}","${f.NavigationPath}","${f.Screenshot}","${f.Accessible}"\n`;
  });
  fs.writeFileSync(path.join(AUDIT_DIR, 'ADMIN_FEATURE_INVENTORY.csv'), featureCsv);
  
  let controlCsv = "Website,Page,Control Text,Control Type,State\n";
  // Deduplicate controls by text per page to avoid massive files for repeated items
  const seenControls = new Set();
  controlInventory.forEach(c => {
    const key = `${c.Page}-${c.ControlText}-${c.ControlType}`;
    if (!seenControls.has(key)) {
      seenControls.add(key);
      controlCsv += `"${c.Website}","${c.Page}","${c.ControlText}","${c.ControlType}","${c.State}"\n`;
    }
  });
  fs.writeFileSync(path.join(AUDIT_DIR, 'CONTROL_INVENTORY.csv'), controlCsv);
  
  console.log("Crawl complete.");
}

crawl().catch(console.error);
