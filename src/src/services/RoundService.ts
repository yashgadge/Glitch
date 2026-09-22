import { collection, doc, onSnapshot, query, where, setDoc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Round } from '../types/models';

export class RoundService {
  private static collectionName = 'rounds';

  /**
   * Get all rounds.
   */
  static async getAllRounds(): Promise<Round[]> {
    const qSnapshot = await getDocs(collection(db, this.collectionName));
    return qSnapshot.docs.map(d => ({ id: Number(d.id), ...d.data() } as Round));
  }

  /**
   * Subscribe to the currently active round.
   */
  static subscribeToActiveRound(callback: (round: Round | null) => void): () => void {
    const q = query(collection(db, this.collectionName), where('status', '==', 'active'));
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        callback({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Round);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error("Error subscribing to active round:", error);
      callback(null);
    });
  }

  /**
   * Admin-only: Create a new round.
   */
  static async createRound(roundId: string, roundData: Omit<Round, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, roundId);
      await setDoc(docRef, {
        ...roundData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error creating round ${roundId}:`, error);
      throw error;
    }
  }

  /**
   * Admin-only: Update round status or properties.
   */
  static async updateRound(roundId: string, updates: Partial<Round>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, roundId);
      await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error(`Error updating round ${roundId}:`, error);
      throw error;
    }
  }
}
