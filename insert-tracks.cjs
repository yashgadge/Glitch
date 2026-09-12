const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, writeBatch } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Use the existing hackathonData
const { hackathonTracks, hackathonProblems } = require('./apps/admin-web/src/pages/dashboards/admin/hackathonData');

async function main() {
  try {
    console.log("Signing in as admin...");
    await signInWithEmailAndPassword(auth, 'yashgadge11155@gmail.com', 'password');
    console.log("Successfully signed in.");

    console.log("Starting data import...");
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
