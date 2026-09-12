import { collection, doc, setDoc, getDoc, onSnapshot, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import type { Submission, SubmissionVersion } from '../types/models';

export class SubmissionService {
  private static collectionName = 'submissions';
  private static versionsCollection = 'submissionVersions';

  static getSubmissionId(teamId: string, roundId: number): string {
    return `${teamId}_${roundId}`;
  }

  static subscribeToTeamSubmission(teamId: string, roundId: number, callback: (submission: Submission | null) => void): () => void {
    const subId = this.getSubmissionId(teamId, roundId);
    const docRef = doc(db, this.collectionName, subId);
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
  
  static subscribeToSubmissionVersion(versionId: string, callback: (version: SubmissionVersion | null) => void): () => void {
    const docRef = doc(db, this.versionsCollection, versionId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as SubmissionVersion);
      } else {
        callback(null);
      }
    });
  }

  static subscribeToAllSubmissionsForRound(roundId: number, callback: (submissions: Submission[]) => void): () => void {
    const q = query(collection(db, this.collectionName), where('roundId', '==', roundId));
    return onSnapshot(q, (snapshot) => {
      const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      callback(submissions);
    }, (error) => {
      console.error('Error subscribing to all submissions for round:', error);
      callback([]);
    });
  }

  static subscribeToAllSubmissions(callback: (submissions: Submission[]) => void): () => void {
    const q = query(collection(db, this.collectionName));
    return onSnapshot(q, (snapshot) => {
      const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      callback(submissions);
    }, (error) => {
      console.error('Error subscribing to all submissions:', error);
      callback([]);
    });
  }

  static async getLatestVersion(submissionId: string, versionNumber: number): Promise<SubmissionVersion | null> {
    const vId = `${submissionId}_v${versionNumber}`;
    const snap = await getDoc(doc(db, this.versionsCollection, vId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as SubmissionVersion;
    }
    return null;
  }

  static async saveDraft(teamId: string, roundId: number, fields: Record<string, any>, currentVersion: number = 0): Promise<void> {
    try {
      const subId = this.getSubmissionId(teamId, roundId);
      const subRef = doc(db, this.collectionName, subId);
      const snap = await getDoc(subRef);
      
      const vNum = currentVersion > 0 ? currentVersion : 1;
      const vId = `${subId}_v${vNum}`;
      const vRef = doc(db, this.versionsCollection, vId);

      const batch = writeBatch(db);

      if (snap.exists()) {
        batch.update(subRef, { updatedAt: new Date().toISOString() });
      } else {
        batch.set(subRef, {
          teamId,
          roundId,
          currentVersion: vNum,
          status: 'not_started', // Because it's only a draft
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      batch.set(vRef, {
        submissionId: subId,
        teamId,
        roundId,
        versionNumber: vNum,
        fields,
        status: 'draft',
        createdAt: new Date().toISOString()
      }, { merge: true });

      await batch.commit();
    } catch (error) {
      console.error(`Error saving draft:`, error);
      throw error;
    }
  }

  static async submitFinal(teamId: string, roundId: number, fields: Record<string, any>, submitterUid: string, isLate: boolean = false, changeSummary?: string): Promise<void> {
    try {
      const submitFn = httpsCallable(functions, 'submitProject');
      await submitFn({
        teamId,
        roundId,
        fields,
        changeSummary
      });
    } catch (error: any) {
      console.error(`Error submitting final:`, error);
      throw new Error(error.message || 'Failed to submit project.');
    }
  }
  
  static async updateStatus(subId: string, status: Submission['status']): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, subId), { 
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error updating submission status:`, error);
      throw error;
    }
  }

  static async updateInternalNotes(subId: string, internalNotes: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, subId), { 
        internalNotes,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error updating internal notes:`, error);
      throw error;
    }
  }
}
