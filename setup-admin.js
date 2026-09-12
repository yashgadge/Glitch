import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  const email = 'yashgadge11155@gmail.com';
  const password = 'Yash@123';
  let uid;
  
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    uid = cred.user.uid;
    console.log('Created user:', uid);
  } catch(e) {
    if (e.code === 'auth/email-already-in-use') {
      console.log('User exists, signing in...');
      const cred = await signInWithEmailAndPassword(auth, email, password);
      uid = cred.user.uid;
    } else {
      console.error('Error with auth:', e);
      process.exit(1);
    }
  }
  
  try {
    await setDoc(doc(db, 'users', uid), {
      email,
      name: 'Yash Gadge',
      role: 'super_admin',
      profileCompleted: true,
      createdAt: new Date().toISOString()
    }, { merge: true });
    console.log('Successfully set user role to super_admin in Firestore!');
  } catch(e) {
    console.error('Error writing to Firestore:', e);
  }
  
  process.exit(0);
}

run();
