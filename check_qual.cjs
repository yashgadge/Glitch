const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function check() {
  const sa = require('./firebase-service-account.json');
  initializeApp({ credential: cert(sa) });
  const db = getFirestore();
  
  const snap = await db.collection('rankings').get();
  snap.forEach(d => console.log('Ranking', d.id, d.data().rank, d.data().qualified));
  
  const snap2 = await db.collection('rankingSnapshots').get();
  snap2.forEach(d => console.log('Snapshot', d.id, d.data().rankingVersion, d.data().rank, d.data().qualified));
}
check().catch(console.error);
