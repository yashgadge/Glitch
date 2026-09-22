import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const AUDIT_DIR = 'F:\\GLITCH36_FRONTEND_REPAIR_WORKSPACE\\visual-audit';
const SCREENSHOTS_DIR = path.join(AUDIT_DIR, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const SITES = [
  { id: 'live_participant', url: 'https://glitch-36.web.app', type: 'participant' },
  { id: 'live_admin', url: 'https://admin-glitch-36.web.app', type: 'admin' },
  { id: 'local_participant', url: 'http://localhost:3000', type: 'participant' },
  { id: 'local_admin', url: 'http://localhost:3001', type: 'admin' },
];

const PARTICIPANT_ROUTES = [
  '/', '/event', '/registration-fees', '/competition-rules', 
  '/terms', '/privacy', '/refund-policy', '/contact', 
  '/login', '/register', '/dashboard'
];

const ADMIN_ROUTES = [
  '/login', '/forgot-password', '/workspace', '/workspace/event'
];

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', width: 375, height: 812 }
];

async function runAudit() {
  const browser = await chromium.launch({ headless: true });
  
  const results = [];
  const errors = [];
  
  for (const site of SITES) {
    const routes = site.type === 'participant' ? PARTICIPANT_ROUTES : ADMIN_ROUTES;
    
    for (const route of routes) {
      for (const vp of VIEWPORTS) {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        const page = await context.newPage();
        
        const siteErrors = [];
        const networkErrors = [];
        
        page.on('console', msg => {
          if (msg.type() === 'error' || msg.type() === 'warning') {
            siteErrors.push({ type: msg.type(), text: msg.text() });
          }
        });
        
        page.on('response', response => {
          if (response.status() >= 400 && response.status() !== 404) {
             networkErrors.push({ url: response.url(), status: response.status() });
          }
        });
        
        const targetUrl = `${site.url}${route}`;
        const screenshotName = `${site.id}_${route.replace(/\//g, '_') || 'home'}_${vp.name}.png`;
        const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
        
        console.log(`Auditing ${targetUrl} [${vp.name}]`);
        
        let loadedUrl = targetUrl;
        let pageTitle = '';
        let success = false;
        let accessible = true;
        
        try {
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
          loadedUrl = page.url();
          pageTitle = await page.title();
          await page.waitForTimeout(2000); // give it a moment to render
          await page.screenshot({ path: screenshotPath, fullPage: true });
          success = true;
          
          if (loadedUrl !== targetUrl && loadedUrl.includes('/login') && !targetUrl.includes('/login')) {
            accessible = false; // redirected to login
          }
        } catch (e) {
          console.log(`Failed ${targetUrl}: ${e.message}`);
          siteErrors.push({ type: 'fatal', text: e.message });
          try {
            await page.screenshot({ path: screenshotPath, fullPage: true });
          } catch (e2) {
            console.log(`Failed to screenshot ${targetUrl}`);
          }
        }
        
        results.push({
          site: site.id,
          route,
          viewport: vp.name,
          targetUrl,
          loadedUrl,
          pageTitle,
          success,
          accessible,
          screenshotName,
          consoleCount: siteErrors.length,
          networkCount: networkErrors.length
        });
        
        if (siteErrors.length > 0 || networkErrors.length > 0) {
          errors.push({
             site: site.id, route, viewport: vp.name,
             console: siteErrors, network: networkErrors
          });
        }
        
        await context.close();
      }
    }
  }
  
  await browser.close();
  
  fs.writeFileSync(path.join(AUDIT_DIR, 'raw_results.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(AUDIT_DIR, 'raw_errors.json'), JSON.stringify(errors, null, 2));
  console.log('Audit complete');
}

runAudit().catch(console.error);
