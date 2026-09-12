const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
admin.initializeApp({
  projectId: "glitch-36"
});

const db = getFirestore();

async function deleteOrders() {
  const orders = ['ORD-0BEOYKC', 'ORD-K7HJTZU', 'ORD-MDINRTF'];
  for (const id of orders) {
    try {
      await db.collection('orders').doc(id).delete();
      console.log(`Deleted order ${id}`);
    } catch (e) {
      console.error(`Error deleting ${id}:`, e);
    }
  }
}

deleteOrders().then(() => process.exit(0));
