import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  projectId: "glitch-36",
  appId: "1:360782322410:web:3f79e9712e804051329593",
  storageBucket: "glitch-36.firebasestorage.app",
  apiKey: "AIzaSyD81Wyfqv2pWtTeaT09gflUxeLQTNp-GhQ",
  authDomain: "glitch-36.firebaseapp.com",
  messagingSenderId: "360782322410",
  measurementId: "G-408XL4401P",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

import { hackathonTracks, hackathonProblems } from './apps/admin-web/src/pages/dashboards/admin/hackathonData';

async function main() {
  try {
    console.log("Starting data import (unauthenticated)...");
    const batch = writeBatch(db);

    hackathonTracks.forEach(track => {
      const trackRef = doc(db, 'tracks', track.id);
      batch.set(trackRef, {
        ...track,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    hackathonProblems.forEach(problem => {
      const problemRef = doc(db, 'problemStatements', problem.id);
      batch.set(problemRef, {
        ...problem,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    await batch.commit();
    console.log("Successfully imported 6 tracks and 24 problem statements!");
    process.exit(0);
  } catch (error) {
    console.error("Error during import:", error);
    process.exit(1);
  }
}

main();
