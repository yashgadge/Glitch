const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

// Only initialize if not already initialized
if (!getApps().length) {
  initializeApp({ projectId: 'glitch-36' });
}

const db = getFirestore();
const [collection, docId, role, email] = process.argv.slice(2);

db.collection(collection).doc(docId).set({
  email: email,
  role: role,
  roles: [role],
  permissions: role === 'super_admin' ? ['*'] : [],
  name: `QA ${role}`,
  mustChangePassword: false
}).then(() => {
  console.log(`Seeded ${docId} in ${collection}`);
  process.exit(0);
}).catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
