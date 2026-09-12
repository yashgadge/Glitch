const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));

  console.log('Navigating to gateway...');
  await page.goto('http://localhost:4173/?access=mission-control', { waitUntil: 'domcontentloaded' });

  console.log('Filling in credentials...');
  await page.waitForSelector('.fixed input[type="email"]');
  await page.type('.fixed input[type="email"]', 'yashgadge11155@gmail.com');
  await page.type('.fixed input[type="password"]', 'Yash@123');

  console.log('Clicking login...');
  await page.click('.fixed button[type="submit"]');

  console.log('Waiting for navigation/render...');
  await new Promise(r => setTimeout(r, 4000));

  console.log('Navigating to Audit Log directly...');
  await page.goto('http://localhost:4173/workspace/audit', { waitUntil: 'domcontentloaded' });
  
  await new Promise(r => setTimeout(r, 2000));

  console.log('Current URL:', page.url());
  
  await browser.close();
})();
