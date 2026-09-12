const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function check() {
  const sa = require('./firebase-service-account.json');
  initializeApp({ credential: cert(sa) });
  const db = getFirestore();
  
  const resultsSnap = await db.collection('results').get();
  console.log('--- RESULTS ---');
  resultsSnap.forEach(doc => {
    console.log(doc.id, doc.data().published, doc.data().teamId, doc.data().roundId);
  });
  
  const rankingsSnap = await db.collection('rankings').get();
  console.log('--- RANKINGS ---');
  rankingsSnap.forEach(doc => {
    console.log(doc.id, doc.data().published, doc.data().teamId, doc.data().roundId, doc.data().qualified);
  });
}

check().catch(console.error);
