const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');

async function runSecurityTest() {
  console.log("Starting Security Audit Test (Unauthenticated)...");

  try {
    const firebaseConfig = {
      projectId: "glitch-36",
      apiKey: "AIzaSyD81Wyfqv2pWtTeaT09gflUxeLQTNp-GhQ"
    };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log("Client initialized.");

    // TEST 1: Attempt to create an event product
    try {
      const productRef = doc(db, 'eventProducts', 'test-product');
      await setDoc(productRef, { name: 'Hacked Product', price: 0 });
      console.error("❌ SECURITY FAILURE: Unauthenticated user was able to create a catalog product!");
    } catch (e) {
      if (e.code === 'permission-denied') {
        console.log("✅ Verified: Unauthenticated user cannot create catalog products (permission-denied).");
      } else {
        console.log("⚠️ Unexpected error during product test:", e.message);
      }
    }

    // TEST 2: Attempt to read staff
    try {
      const staffRef = doc(db, 'staff', 'some-id');
      await getDoc(staffRef);
      console.error("❌ SECURITY FAILURE: Unauthenticated user was able to read a staff record!");
    } catch (e) {
      if (e.code === 'permission-denied') {
        console.log("✅ Verified: Unauthenticated user cannot read staff records (permission-denied).");
      } else {
        console.log("⚠️ Unexpected error during staff test:", e.message);
      }
    }

    // TEST 3: Attempt to create a digital pass
    try {
      const passRef = doc(db, 'digitalPasses', 'fake-pass-id');
      await setDoc(passRef, { participantId: 'hacker', token: 'FAKE-TOKEN' });
      console.error("❌ SECURITY FAILURE: Unauthenticated user was able to create a digital pass!");
    } catch (e) {
      if (e.code === 'permission-denied') {
        console.log("✅ Verified: Unauthenticated user cannot manually create a digital pass (permission-denied).");
      } else {
        console.log("⚠️ Unexpected error during pass test:", e.message);
      }
    }

    console.log("Security Audit Test Completed.");
    process.exit(0);

  } catch (err) {
    console.error("Fatal test error:", err.message);
    process.exit(1);
  }
}

runSecurityTest();
