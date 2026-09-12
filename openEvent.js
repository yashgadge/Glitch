import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Read the service account key
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function openEvent() {
  const configRef = db.doc('system/eventConfig');
  await configRef.set({ isEventActive: true }, { merge: true });
  console.log('Event is now OPEN.');
}

openEvent().catch(console.error);
