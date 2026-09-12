const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

async function cleanup() {
  console.log('Fetching rounds and submissions...');
  const roundsSnap = await db.collection('rounds').get();
  const validRoundIds = new Set(roundsSnap.docs.map(d => Number(d.id)));

  const subsSnap = await db.collection('submissions').get();
  let deletedCount = 0;
  
  for (const doc of subsSnap.docs) {
    const data = doc.data();
    if (!validRoundIds.has(data.roundId)) {
      console.log(`Deleting orphaned submission ${doc.id} (round ${data.roundId})`);
      await doc.ref.delete();
      deletedCount++;
    }
  }
  
  console.log(`Deleted ${deletedCount} orphaned submissions.`);
}

cleanup().catch(console.error);
