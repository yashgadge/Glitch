import { collection, onSnapshot, query, where, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { guardValue } from '../lib/firestoreGuard';
import type { Announcement, Role } from '../types/models';

export class AnnouncementService {
  private static collectionName = 'announcements';

  /**
   * Subscribe to announcements filtered by role.
   */
  static subscribeToAnnouncements(role: Role, callback: (announcements: Announcement[]) => void): () => void {
    const validRole = guardValue(role, 'role');
    const q = query(
      collection(db, this.collectionName), 
      where('targetRoles', 'array-contains', validRole)
    );
    
    return onSnapshot(q, (snapshot) => {
      const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      
      // Sort client-side to avoid composite index requirement for real-time listener
      announcements.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      callback(announcements);
    }, (error) => {
      console.error("Error subscribing to announcements:", error);
      callback([]);
    });
  }

  /**
   * Admin only: Create a new announcement.
   */
  static async createAnnouncement(announcement: Omit<Announcement, 'id' | 'timestamp'>): Promise<void> {
    try {
      await addDoc(collection(db, this.collectionName), {
        ...announcement,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error creating announcement:", error);
      throw error;
    }
  }
}
