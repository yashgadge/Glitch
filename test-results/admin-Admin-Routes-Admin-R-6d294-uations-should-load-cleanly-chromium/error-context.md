# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.ts >> Admin Routes >> Admin Route: evaluations should load cleanly
- Location: tests\runtime\admin.spec.ts:38:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 4
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e5]:
    - link "BACK TO MISSION CONTROL" [ref=e6] [cursor=pointer]:
      - /url: /
      - img [ref=e7]
      - generic [ref=e9]: BACK TO MISSION CONTROL
    - generic [ref=e10]:
      - generic [ref=e11]:
        - heading "ACCESS TERMINAL" [level=1] [ref=e12]
        - paragraph [ref=e13]: AUTHENTICATE TO CONTINUE
      - generic [ref=e14]:
        - generic [ref=e16]:
          - img [ref=e17]
          - textbox "EMAIL ADDRESS" [ref=e20]: yashgadge11155@gmail.com
        - generic [ref=e21]:
          - generic [ref=e22]:
            - img [ref=e23]
            - textbox "PASSWORD" [ref=e26]: Yash@123
          - link "FORGOT PASSWORD?" [ref=e28] [cursor=pointer]:
            - /url: /forgot-password
        - button "INITIATE LOGIN" [ref=e29] [cursor=pointer]:
          - img [ref=e30]
          - text: INITIATE LOGIN
  - button "v3.0.2 Output Detail Standard React Components Hide Until Restart Marker Color Clear on copy/send Block page interactions Manage MCP & Webhooks Manage MCP & Webhooks MCP Connection Disconnected MCP connection allows agents to receive and act on annotations. Learn more Webhooks Auto-Send The webhook URL will receive live annotation changes and annotation data." [ref=e34] [cursor=pointer]:
    - img [ref=e36]
    - generic:
      - generic:
        - button:
          - img
      - generic:
        - button:
          - img
      - generic:
        - button [disabled]:
          - img
      - generic:
        - button [disabled]:
          - img
      - generic:
        - button [disabled]:
          - img
      - generic:
        - button [disabled]:
          - img
      - generic:
        - button:
          - img
      - generic:
        - button:
          - img
    - generic:
      - generic:
        - generic:
          - generic:
            - link:
              - /url: https://agentation.com
              - img
            - paragraph: v3.0.2
            - button "Switch to light mode":
              - generic:
                - generic:
                  - img
          - generic:
            - generic:
              - generic:
                - text: Output Detail
                - generic:
                  - img
              - button "Standard":
                - generic: Standard
            - generic:
              - generic:
                - text: React Components
                - generic:
                  - img
              - generic:
                - checkbox [checked]
            - generic:
              - generic:
                - text: Hide Until Restart
                - generic:
                  - img
              - generic:
                - checkbox
          - generic:
            - generic: Marker Color
            - generic:
              - button "Indigo"
              - button "Blue"
              - button "Cyan"
              - button "Green"
              - button "Yellow"
              - button "Orange"
              - button "Red"
          - generic:
            - generic:
              - generic:
                - checkbox "Clear on copy/send"
                - img
              - generic: Clear on copy/send
              - generic:
                - img
            - generic:
              - generic:
                - checkbox "Block page interactions" [checked]
                - img
              - generic: Block page interactions
          - button "Manage MCP & Webhooks":
            - generic: Manage MCP & Webhooks
            - generic:
              - img
        - generic:
          - button "Manage MCP & Webhooks":
            - img
            - generic: Manage MCP & Webhooks
          - generic:
            - generic:
              - generic:
                - text: MCP Connection
                - generic:
                  - img
              - generic "Disconnected"
            - paragraph:
              - text: MCP connection allows agents to receive and act on annotations.
              - link "Learn more":
                - /url: https://agentation.dev/mcp
          - generic:
            - generic:
              - generic:
                - text: Webhooks
                - generic:
                  - img
              - generic:
                - generic: Auto-Send
                - generic:
                  - checkbox "Auto-Send" [checked] [disabled]
            - paragraph: The webhook URL will receive live annotation changes and annotation data.
            - textbox "Webhook URL"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { setupErrorInterceptors } from './helpers/auth';
  3  | 
  4  | test.use({ storageState: 'tests/runtime/.auth/super_admin.json' });
  5  | 
  6  | const adminRoutes = [
  7  |   { path: '/workspace', name: 'admin-dashboard' },
  8  |   { path: '/workspace/participants', name: 'participants' },
  9  |   { path: '/workspace/import', name: 'import' },
  10 |   { path: '/workspace/staff', name: 'staff' },
  11 |   { path: '/workspace/classrooms', name: 'classrooms' },
  12 |   { path: '/workspace/results', name: 'results' },
  13 |   { path: '/workspace/evaluation', name: 'evaluations' },
  14 |   { path: '/workspace/submissions', name: 'submission-manager' },
  15 |   { path: '/workspace/engine', name: 'submission-settings' },
  16 |   { path: '/workspace/communication', name: 'communications' },
  17 |   { path: '/workspace/certificates', name: 'certificates' },
  18 |   { path: '/workspace/digital-pass', name: 'digital-passes' },
  19 |   { path: '/workspace/activity', name: 'audit-log' },
  20 | ];
  21 | 
  22 | test.describe('Admin Routes', () => {
  23 |   let errors: any[] = [];
  24 | 
  25 |   test.beforeEach(async ({ page }) => {
  26 |     errors = [];
  27 |     setupErrorInterceptors(page, errors);
  28 |   });
  29 | 
  30 |   test.afterEach(async ({ page }) => {
  31 |     if (errors.length > 0) {
  32 |       console.log('Errors detected:', errors);
  33 |     }
> 34 |     expect(errors.length).toBe(0);
     |                           ^ Error: expect(received).toBe(expected) // Object.is equality
  35 |   });
  36 | 
  37 |   for (const route of adminRoutes) {
  38 |     test(`Admin Route: ${route.name} should load cleanly`, async ({ page }) => {
  39 |       await page.goto(route.path);
  40 |       
  41 |       await page.screenshot({ path: `runtime-report/screenshots/${route.name}.png` });
  42 |     });
  43 |   }
  44 | });
  45 | 
```