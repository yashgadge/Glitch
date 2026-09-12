import { chromium, FullConfig } from '@playwright/test';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, doc, setDoc, connectFirestoreEmulator } from 'firebase/firestore';
import { execSync } from 'child_process';

async function globalSetup(config: FullConfig) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  
  // Wait for emulators to be ready
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9099/');
      if (res.ok || res.status === 200 || res.status === 404) {
        ready = true;
        break;
      }
    } catch (e) {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error("Firebase Emulators not ready");

  const app = initializeApp({ projectId: 'glitch-36', apiKey: 'fake-key' });
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

  const accounts = [
    { email: 'qa-admin@glitch36.com', password: 'password', role: 'super_admin', collection: 'staff' },
    { email: 'qa-judge@glitch36.com', password: 'password', role: 'judge', collection: 'staff' },
    { email: 'qa-volunteer@glitch36.com', password: 'password', role: 'volunteer', collection: 'staff' },
    { email: 'qa-participant@glitch36.com', password: 'password', role: 'participant', collection: 'participants' }
  ];

  for (const acc of accounts) {
    try {
      // 1. Create Auth User via Client SDK
      let uid = '';
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, acc.email, acc.password);
        uid = userCredential.user.uid;
      } catch (e: any) {
        if (e.code === 'auth/email-already-in-use') {
          console.log(`${acc.email} already exists, proceeding to login...`);
          // We can't get the uid easily from the error, but we don't strictly need it if Firestore is already seeded.
          // Wait, we DO need the uid to seed Firestore. But if they already exist, let's just sign them in to get the UID!
          const signInRes = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: acc.email, password: acc.password, returnSecureToken: true })
          });
          const signInData = await signInRes.json();
          uid = signInData.localId;
        } else {
          throw e;
        }
      }

      // 2. Seed Firestore Role via CommonJS script using Admin SDK to bypass rules completely
      try {
        const out = execSync(`node tests/runtime/seed-firestore.cjs ${acc.collection} ${uid} ${acc.role} ${acc.email}`);
        console.log(out.toString());
      } catch (e: any) {
        console.error(`Failed to seed ${acc.email} in Firestore:`, e.stderr?.toString());
        throw e;
      }
      
      console.log(`Created ${acc.role} QA account`);
      
      // Log in via UI to capture storage state
      const browser = await chromium.launch();
      const page = await browser.newPage();
      
      // Set emulator flag via local storage if needed, Vite will inject it though
      await page.goto('http://localhost:5173/login');
      
      await page.fill('input[type="email"]', acc.email);
      await page.fill('input[type="password"]', acc.password);
      await page.click('button[type="submit"]');
      
      try {
        await page.waitForURL('**/workspace**', { timeout: 15000 });
        await page.context().storageState({ path: `tests/runtime/.auth/${acc.role}.json` });
      } catch (e) {
        await page.screenshot({ path: `tests/runtime/.auth/error-${acc.role}.png` });
        const html = await page.content();
        console.error(`Login failed for ${acc.role}. Page HTML snippet:`);
        console.error(html.substring(0, 1000));
        const errText = await page.locator('.text-red-500, .bg-red-500, .error').allTextContents();
        console.error(`Visible errors:`, errText);
        throw e;
      }
      
      await browser.close();
    } catch (e) {
      console.error(`Failed to setup ${acc.email}:`, e);
    }
  }
}

export default globalSetup;
