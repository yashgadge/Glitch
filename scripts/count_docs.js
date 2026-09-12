const admin = require("firebase-admin");

admin.initializeApp({
  projectId: "glitch-36" // Will use local ADC or Emulator if available, but since we are not authenticated with gcloud, this might fail unless firebase-admin automatically picks up firebase CLI credentials? Let's test.
});

const db = admin.firestore();

async function run() {
  const collections = await db.listCollections();
  console.log("Collections:", collections.map(c => c.id).join(", "));
  
  const counts = {};
  for (const col of collections) {
     try {
       const snap = await col.count().get();
       counts[col.id] = snap.data().count;
     } catch (e) {
       counts[col.id] = "Error";
     }
  }
  
  console.log(JSON.stringify(counts, null, 2));
}

run().catch(console.error);
