import { collection, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export class NotificationService {
  private static collectionName = 'notifications';

  static subscribeToPersonalNotifications(userId: string, callback: (notifications: any[]) => void): () => void {
    const q = query(
      collection(db, this.collectionName), 
      where('recipientId', '==', userId)
    );
    
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      notifications.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(notifications);
    }, (error) => {
      console.error("Error subscribing to personal notifications:", error);
      callback([]);
    });
  }

  static async sendPersonalNotification(recipientId: string, title: string, content: string, type: string = 'info'): Promise<void> {
    try {
      await addDoc(collection(db, this.collectionName), {
        recipientId,
        title,
        content,
        type,
        priority: 'high',
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error sending notification:", error);
      throw error;
    }
  }
}
