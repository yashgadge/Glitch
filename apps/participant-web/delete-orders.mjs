import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "mock",
  authDomain: "glitch-36.firebaseapp.com",
  projectId: "glitch-36"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteOrders() {
  const orders = ['ORD-0BEOYKC', 'ORD-K7HJTZU', 'ORD-MDINRTF'];
  for (const id of orders) {
    try {
      await deleteDoc(doc(db, 'orders', id));
      console.log(`Deleted order ${id}`);
    } catch (e) {
      console.error(`Error deleting ${id}:`, e);
    }
  }
}

deleteOrders().then(() => process.exit(0));
