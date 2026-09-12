const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "glitch-36",
  appId: "1:360782322410:web:3f79e9712e804051329593",
  storageBucket: "glitch-36.firebasestorage.app",
  apiKey: "AIzaSyD81Wyfqv2pWtTeaT09gflUxeLQTNp-GhQ",
  authDomain: "glitch-36.firebaseapp.com",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testUnauth() {
  console.log("Testing unauthenticated read on 'participants'...");
  try {
    await getDocs(collection(db, 'participants'));
    console.log("FAILED: Unauthenticated user could read participants!");
  } catch (e) {
    console.log("SUCCESS: Unauthenticated read blocked. Error:", e.code);
  }

  console.log("Testing unauthenticated write on 'participants'...");
  try {
    await setDoc(doc(db, 'participants', 'test1234'), { name: "Hacker" });
    console.log("FAILED: Unauthenticated user could write participants!");
  } catch (e) {
    console.log("SUCCESS: Unauthenticated write blocked. Error:", e.code);
  }
}

testUnauth();
