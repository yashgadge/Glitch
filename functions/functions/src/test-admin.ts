import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

admin.initializeApp({
  projectId: 'glitch-36'
});

async function run() {
  try {
    const db = getFirestore();
    const auth = getAuth();
    const snap = await db.collection('participants').limit(1).get();
    console.log('Successfully connected to Firestore! Found participants:', snap.size);
    
    // We'll also just check if we can list users
    const result = await auth.listUsers(1);
    console.log('Successfully connected to Auth! Found user:', result.users[0]?.uid);

  } catch (e) {
    console.error('Failed:', e);
  }
}

run();
