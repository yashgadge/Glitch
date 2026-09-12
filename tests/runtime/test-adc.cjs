const { initializeApp, getApps, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

try {
  if (!getApps().length) {
    initializeApp({ projectId: 'glitch-36', credential: applicationDefault() });
  }
  const db = getFirestore();
  db.collection('test').doc('test').set({ timestamp: FieldValue.serverTimestamp() })
    .then(() => {
      console.log('SUCCESS: Admin SDK can write to remote DB via ADC');
      process.exit(0);
    })
    .catch((err) => {
      console.error('FAILED to write:', err.message);
      process.exit(1);
    });
} catch (err) {
  console.error('Init error:', err.message);
  process.exit(1);
}
