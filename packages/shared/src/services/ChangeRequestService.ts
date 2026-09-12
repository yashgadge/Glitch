import { collection, doc, query, where, getDocs, setDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ChangeRequest } from '../types/models';

export class ChangeRequestService {
  private static collectionName = 'changeRequests';

  static async getRequestsForSubmission(submissionId: string): Promise<ChangeRequest[]> {
    const q = query(collection(db, this.collectionName), where('submissionId', '==', submissionId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChangeRequest));
  }
  
  static subscribeToRequestsForSubmission(submissionId: string, callback: (requests: ChangeRequest[]) => void): () => void {
    const q = query(collection(db, this.collectionName), where('submissionId', '==', submissionId));
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChangeRequest));
      callback(requests);
    });
  }

  static async createRequests(requests: Omit<ChangeRequest, 'id' | 'createdAt'>[]): Promise<void> {
    const batch = writeBatch(db);
    requests.forEach(req => {
      const docRef = doc(collection(db, this.collectionName));
      batch.set(docRef, {
        ...req,
        createdAt: new Date().toISOString()
      });
    });
    await batch.commit();
  }

  static async updateParticipantExplanations(updates: { id: string, status: ChangeRequest['status'], explanation?: string }[]): Promise<void> {
    const batch = writeBatch(db);
    updates.forEach(update => {
      const docRef = doc(db, this.collectionName, update.id);
      batch.update(docRef, {
        status: update.status,
        participantExplanation: update.explanation || null
      });
    });
    await batch.commit();
  }
}
