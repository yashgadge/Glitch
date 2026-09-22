const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

initializeApp();

const db = getFirestore();
const auth = getAuth();

async function createTestParticipant() {
  const email = "test@gmail.com";
  const password = "Yash@123";
  const name = "Test Participant";

  try {
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`User already exists with UID: ${userRecord.uid}. Updating password...`);
      await auth.updateUser(userRecord.uid, { password });
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        console.log("Creating new user in Auth...");
        userRecord = await auth.createUser({
          email,
          password,
          displayName: name,
          emailVerified: true
        });
      } else {
        throw e;
      }
    }

    console.log("Setting custom claims...");
    await auth.setCustomUserClaims(userRecord.uid, { roles: ['participant'] });

    console.log("Creating participant document in Firestore...");
    await db.collection("participants").doc(userRecord.uid).set({
      id: userRecord.uid,
      email: email,
      name: name,
      phone: "1234567890",
      roles: ['participant'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "ready_for_checkin",
      teamId: null,
      glitchId: "GL36-TEST-001"
    }, { merge: true });

    console.log("Success! Test participant created.");
    process.exit(0);
  } catch (err) {
    console.error("Error creating test participant:", err);
    process.exit(1);
  }
}

createTestParticipant();
