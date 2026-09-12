const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./accounts.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function fixRoles() {
  try {
    const snapshot = await db.collection('staff').where('email', '==', 'yashgadge11155@gmail.com').get();
    if (snapshot.empty) {
      console.log('No staff member found with this email.');
      process.exit(1);
    }
    
    for (const doc of snapshot.docs) {
      console.log('Found staff document:', doc.id, 'with data:', doc.data());
      await doc.ref.update({
        roles: ['super_admin'],
        role: 'super_admin'
      });
      console.log('Successfully updated roles to super_admin for:', doc.id);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

fixRoles();
