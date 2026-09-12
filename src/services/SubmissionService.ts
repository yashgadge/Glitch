import { collection, doc, setDoc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Submission } from '../types/models';

export class SubmissionService {
  private static collectionName = 'submissions';

  static subscribeToTeamSubmission(teamId: string, callback: (submission: Submission | null) => void): () => void {
    const docRef = doc(db, this.collectionName, teamId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as Submission);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error(`Error subscribing to submission for team ${teamId}:`, error);
      callback(null);
    });
  }
  
  static subscribeToAllSubmissions(callback: (submissions: Submission[]) => void): () => void {
    return onSnapshot(collection(db, this.collectionName), (snapshot) => {
      const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      callback(submissions);
    }, (error) => {
      console.error('Error subscribing to all submissions:', error);
      callback([]);
    });
  }

  static async saveDraft(teamId: string, fields: Record<string, any>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, teamId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        await updateDoc(docRef, { 
          fields,
          status: 'draft',
          updatedAt: new Date().toISOString() 
        });
      } else {
        await setDoc(docRef, {
          teamId,
          fields,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`Error saving draft for team ${teamId}:`, error);
      throw error;
    }
  }

  static async submitFinal(teamId: string, fields: Record<string, any>, isLate: boolean = false): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, teamId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        await updateDoc(docRef, { 
          fields, 
          status: isLate ? 'late' : 'submitted',
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString() 
        });
      } else {
        await setDoc(docRef, {
          teamId,
          fields,
          status: isLate ? 'late' : 'submitted',
          submittedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`Error submitting final project for team ${teamId}:`, error);
      throw error;
    }
  }
  
  static async updateStatus(teamId: string, status: 'draft' | 'submitted' | 'locked' | 'late'): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, teamId);
      await updateDoc(docRef, { 
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error updating submission status for team ${teamId}:`, error);
      throw error;
    }
  }

  static async updateInternalNotes(teamId: string, internalNotes: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, teamId);
      await updateDoc(docRef, { 
        internalNotes,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error updating internal notes for team ${teamId}:`, error);
      throw error;
    }
  }
}
