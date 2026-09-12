import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyD-mock",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "mock.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "glitch-36",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const snap1 = await getDocs(collection(db, 'eventProducts'));
    console.log("All products:", snap1.docs.map(d => d.data()));

    const q = query(collection(db, 'eventProducts'), where('isActive', '==', true));
    const snap2 = await getDocs(q);
    console.log("Active products:", snap2.docs.map(d => d.data()));
  } catch(e) {
    console.error(e);
  }
}
run();
