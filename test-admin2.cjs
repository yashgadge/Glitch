
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault(),
  projectId: 'glitch-36'
});

async function run() {
  try {
    const db = getFirestore();
    const docRef = db.collection('test').doc('test');
    await docRef.set({ test: true });
    console.log('Success');
  } catch (e) {
    console.error('Failed:', e);
  }
}
run();
