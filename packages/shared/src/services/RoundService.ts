import { collection, doc, onSnapshot, query, where, setDoc, updateDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Round } from '../types/models';

export class RoundService {
  private static collectionName = 'rounds';

  /**
   * Get all rounds.
   */
  static async getAllRounds(): Promise<Round[]> {
    const q = query(collection(db, 'rounds'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Round));
  }

  static subscribeToAllRounds(callback: (rounds: Round[]) => void): () => void {
    const q = query(collection(db, 'rounds'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Round)));
    });
  }

  /**
   * Subscribe to the currently active round.
   */
  static subscribeToActiveRound(callback: (round: Round | null) => void): () => void {
    const q = query(collection(db, this.collectionName), where('status', '==', 'active'));
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        callback({ id: String(snapshot.docs[0].id), ...snapshot.docs[0].data() } as Round);
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
      const docRef = doc(db, this.collectionName, String(roundId));
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
      const docRef = doc(db, this.collectionName, String(roundId));
      await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error(`Error updating round ${roundId}:`, error);
      throw error;
    }
  }

  /**
   * Admin-only: Delete a round.
   */
  static async deleteRound(roundId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, String(roundId));
      
      const numRoundId = Number(roundId);

      // Get all related documents to delete
      const evalsQ = query(collection(db, 'evaluations'), where('roundId', '==', numRoundId));
      const subsQ = query(collection(db, 'submissions'), where('roundId', '==', numRoundId));
      const subVersQ = query(collection(db, 'submissionVersions'), where('roundId', '==', numRoundId));
      const assignsQ = query(collection(db, 'evaluationAssignments'), where('roundId', '==', numRoundId));

      const [evalsSnap, subsSnap, subVersSnap, assignsSnap] = await Promise.all([
        getDocs(evalsQ),
        getDocs(subsQ),
        getDocs(subVersQ),
        getDocs(assignsQ)
      ]);

      const batch = writeBatch(db);
      
      // Add round doc to batch
      batch.delete(docRef);

      // We should ideally chunk batches if > 500, but for rounds this should be fine for now.
      // If we expect > 500 docs, we can loop batches.
      const allDocs = [...evalsSnap.docs, ...subsSnap.docs, ...subVersSnap.docs, ...assignsSnap.docs];
      
      // Chunking into arrays of 400 to be safe
      for (let i = 0; i < allDocs.length; i += 400) {
        const chunk = allDocs.slice(i, i + 400);
        const b = writeBatch(db);
        chunk.forEach(d => b.delete(d.ref));
        await b.commit();
      }

      // Delete the round document if not deleted in the chunk (it might be in its own batch)
      await batch.commit();

    } catch (error) {
      console.error(`Error deleting round ${roundId}:`, error);
      throw error;
    }
  }
}
