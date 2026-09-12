import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD81Wyfqv2pWtTeaT09gflUxeLQTNp-GhQ",
  authDomain: "glitch-36.firebaseapp.com",
  projectId: "glitch-36"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const snap = await getDoc(doc(db, 'system', 'eventConfig'));
    if (snap.exists()) {
      const data = snap.data();
      if (data.catalog && Array.isArray(data.catalog)) {
        console.log("Found", data.catalog.length, "items in old catalog. Migrating...");
        for (const item of data.catalog) {
           const id = item.id || `migrated-${Date.now()}`;
           await setDoc(doc(db, 'eventProducts', id), {
             ...item,
             id: id,
             isActive: true,
             purchaseEnabled: true,
             redemptionEnabled: true
           }, { merge: true });
           console.log("Migrated", item.name);
        }
      }
    }
    process.exit(0);
  } catch(e) {
    console.error("ERROR:", e);
    process.exit(1);
  }
}
run();
