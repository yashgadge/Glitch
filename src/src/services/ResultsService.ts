import { collection, doc, onSnapshot, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { guardValue } from '../lib/firestoreGuard';
import type { Result } from '../types/models';

export class ResultsService {
  private static collectionName = 'results';

  /**
   * Subscribe to a team's result for a specific round.
   * Participants only see it if published == true.
   */
  static subscribeToTeamResult(teamId: string, roundId: number, onlyPublished: boolean, callback: (result: Result | null) => void): () => void {
    const validTeamId = guardValue(teamId, 'teamId');
    const validRoundId = guardValue(roundId, 'roundId');
    const q = onlyPublished 
      ? query(collection(db, this.collectionName), where('teamId', '==', validTeamId), where('roundId', '==', validRoundId), where('published', '==', true))
      : query(collection(db, this.collectionName), where('teamId', '==', validTeamId), where('roundId', '==', validRoundId));
      
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        callback({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Result);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error(`Error subscribing to result for team ${teamId}:`, error);
      callback(null);
    });
  }

  /**
   * Admin-only: Publish a result to participants.
   */
  static async publishResult(resultId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, resultId);
      await updateDoc(docRef, { published: true, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("Error publishing result:", error);
      throw error;
    }
  }

  /**
   * Admin-only: Unpublish a result.
   */
  static async unpublishResult(resultId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, resultId);
      await updateDoc(docRef, { published: false, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("Error unpublishing result:", error);
      throw error;
    }
  }
}
