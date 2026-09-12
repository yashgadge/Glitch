
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'glitch-36'
});

async function run() {
  try {
    const db = admin.firestore();
    const docRef = db.collection('test').doc('test');
    await docRef.set({ test: true });
    console.log('Success');
  } catch (e) {
    console.error('Failed:', e);
  }
}
run();
