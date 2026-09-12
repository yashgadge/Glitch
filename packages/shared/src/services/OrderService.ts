import { collection, doc, query, where, onSnapshot, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Order, OrderStatus } from '../types/models';

export class OrderService {
  private static collectionName = 'orders';

  /**
   * Subscribe to all orders (Admin view)
   */
  static subscribeToAllOrders(callback: (orders: Order[]) => void): () => void {
    const q = query(collection(db, this.collectionName));
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      callback(orders);
    });
  }

  /**
   * Subscribe to orders for a specific participant
   */
  static subscribeToParticipantOrders(participantId: string, callback: (orders: Order[]) => void): () => void {
    if (!participantId) {
      callback([]);
      return () => {};
    }
    const q = query(
      collection(db, this.collectionName),
      where('participantId', '==', participantId)
    );
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      callback(orders);
    });
  }

  /**
   * Create a new order
   */
  static async createOrder(order: Omit<Order, 'createdAt' | 'updatedAt'>): Promise<void> {
    const docRef = doc(collection(db, this.collectionName), order.id);
    const now = new Date().toISOString();
    await setDoc(docRef, {
      ...order,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const docRef = doc(db, this.collectionName, orderId);
    await updateDoc(docRef, {
      status,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Delete an order
   */
  static async deleteOrder(orderId: string): Promise<void> {
    const docRef = doc(db, this.collectionName, orderId);
    await deleteDoc(docRef);
  }
}
