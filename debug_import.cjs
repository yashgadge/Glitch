const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, updateDoc, getDoc, runTransaction, collection, getDocs, query, where, writeBatch } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "glitch-36",
  appId: "1:360782322410:web:3f79e9712e804051329593",
  storageBucket: "glitch-36.firebasestorage.app",
  apiKey: "AIzaSyD81Wyfqv2pWtTeaT09gflUxeLQTNp-GhQ",
  authDomain: "glitch-36.firebaseapp.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function generateSecureToken() {
  const crypto = require('crypto');
  return `GL36-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
}

async function debugImport() {
  console.log("Starting Debug Import...");
  const p = {
    name: "Debug User",
    email: "debug.user+v7@example.com",
    mobile: "9998887774",
    registrationId: "REG-DEBUG1",
    teamName: "Debug Team",
    teamCode: "DEBUG123",
    track: "Web"
  };
  const tempPass = "GLITCH-1234";

  try {
    // We MUST be logged in as an Admin to create Teams and Profiles (since rules require isAuthenticated)
    // Wait, the client UI is logged in as the Admin! Our Node script is NOT logged in!
    // But we don't have the Admin's password!
    console.log("Notice: Node script is not logged in as Admin. Trying anyway...");
    
    // We can just try to create the user on a secondary auth!
    const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
    const secondaryAuth = getAuth(secondaryApp);
    
    console.log("1. Creating Auth Account...");
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, p.email, tempPass);
    const uid = userCredential.user.uid;
    console.log("Auth Created! UID:", uid);

    console.log("2. Creating Firestore Profile (Requires Admin Auth, might fail)...");
    const counterRef = doc(db, 'counters', 'participant');
    
    await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let newCount = 1;
      if (!counterDoc.exists()) {
        transaction.set(counterRef, { participantCount: 1 });
      } else {
        newCount = (counterDoc.data().participantCount || 0) + 1;
        transaction.update(counterRef, { participantCount: newCount });
      }
      
      const participantId = `GL26-P-${newCount.toString().padStart(6, '0')}`;
      
      const passRef = doc(collection(db, 'digitalPasses'));
      const passData = {
        participantId: uid,
        token: generateSecureToken(),
        status: 'active',
        createdAt: new Date().toISOString(),
        activatedAt: new Date().toISOString(),
        scanCount: 0,
        reissueCount: 0,
        isRevoked: false,
        version: 1
      };
      transaction.set(passRef, passData);
      
      const participantData = {
        email: p.email,
        name: p.name,
        mobile: p.mobile,
        registrationId: p.registrationId,
        role: 'participant',
        mustChangePassword: true,
        tempPass: tempPass,
        profileCompleted: false,
        status: 'imported',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      transaction.set(doc(db, 'participants', uid), {
        ...participantData,
        participantId,
        digitalPassId: passRef.id,
        qrToken: passData.token,
        qrCreatedAt: passData.createdAt,
        qrVersion: passData.version
      });
    });
    
    console.log("Firestore Profile Created!");
    
    // Cleanup
    process.exit(0);
  } catch (err) {
    console.error("DEBUG IMPORT FAILED:");
    console.error(err);
    process.exit(1);
  }
}

debugImport();
