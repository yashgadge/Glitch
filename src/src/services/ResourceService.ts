import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Resource } from '../types/models';

export class ResourceService {
  private static collectionName = 'resources';

  /**
   * Subscribe to all resources
   */
  static subscribeToResources(callback: (resources: Resource[]) => void): () => void {
    const q = query(collection(db, this.collectionName), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const resources = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource));
      callback(resources);
    }, (error) => {
      console.error(`Error subscribing to resources:`, error);
      callback([]);
    });
  }

  static async addResource(resourceData: Omit<Resource, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), resourceData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding resource:', error);
      throw error;
    }
  }

  static async deleteResource(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
    } catch (error) {
      console.error('Error deleting resource:', error);
      throw error;
    }
  }
}
