import { collection, doc, setDoc, getDoc, getDocs, updateDoc, onSnapshot, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { SubmissionField, RoundSubmissionConfig } from '../types/models';

export class SubmissionConfigService {
  private static fieldsCollection = 'submissionFields';
  private static configCollection = 'roundSubmissionConfigs';

  // Round Config Methods

  static subscribeToRoundConfig(roundId: number, callback: (config: RoundSubmissionConfig | null) => void): () => void {
    const docRef = doc(db, this.configCollection, roundId.toString());
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as RoundSubmissionConfig);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error(`Error subscribing to round config ${roundId}:`, error);
      callback(null);
    });
  }

  static async getRoundConfig(roundId: number): Promise<RoundSubmissionConfig | null> {
    try {
      const docRef = doc(db, this.configCollection, roundId.toString());
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as RoundSubmissionConfig;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching round config ${roundId}:`, error);
      throw error;
    }
  }

  static async updateRoundConfig(roundId: number, updates: Partial<RoundSubmissionConfig>): Promise<void> {
    try {
      const docRef = doc(db, this.configCollection, roundId.toString());
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
      } else {
        // Create default if not exists
        await setDoc(docRef, {
          roundId,
          enabled: true,
          submitterRole: 'team_leader',
          fallbackSubmitterRole: 'vice_leader',
          maxRevisions: 2,
          autoLockAfterDeadline: true,
          allowLateSubmission: false,
          allowDraftEditing: true,
          allowEditingAfterSubmission: false,
          allowChangeRequests: true,
          changeRequestRoles: ['admin', 'judge'],
          presentationRequired: true,
          maxPdfSizeMB: 10,
          updatedAt: new Date().toISOString(),
          ...updates
        });
      }
    } catch (error) {
      console.error(`Error updating round config ${roundId}:`, error);
      throw error;
    }
  }

  // Field Methods

  static subscribeToFields(roundId: number, callback: (fields: SubmissionField[]) => void): () => void {
    const q = query(collection(db, this.fieldsCollection), where('roundId', '==', roundId));
    return onSnapshot(q, (snapshot) => {
      const fields = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubmissionField));
      fields.sort((a, b) => a.displayOrder - b.displayOrder);
      callback(fields);
    }, (error) => {
      console.error(`Error subscribing to submission fields for round ${roundId}:`, error);
      callback([]);
    });
  }

  static async getFields(roundId: number): Promise<SubmissionField[]> {
    try {
      const q = query(collection(db, this.fieldsCollection), where('roundId', '==', roundId));
      const snapshot = await getDocs(q);
      const fields = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubmissionField));
      return fields.sort((a, b) => a.displayOrder - b.displayOrder);
    } catch (error) {
      console.error(`Error fetching submission fields for round ${roundId}:`, error);
      throw error;
    }
  }

  static async addField(roundId: number, field: Omit<SubmissionField, 'id' | 'roundId'>): Promise<void> {
    try {
      const docRef = doc(collection(db, this.fieldsCollection));
      await setDoc(docRef, { ...field, roundId, id: docRef.id });
    } catch (error) {
      console.error('Error adding submission field:', error);
      throw error;
    }
  }

  static async updateField(fieldId: string, updates: Partial<SubmissionField>): Promise<void> {
    try {
      const docRef = doc(db, this.fieldsCollection, fieldId);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating submission field:', error);
      throw error;
    }
  }

  static async deleteField(fieldId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.fieldsCollection, fieldId));
    } catch (error) {
      console.error('Error deleting submission field:', error);
      throw error;
    }
  }

  static async reorderFields(fieldIds: string[]): Promise<void> {
    try {
      const promises = fieldIds.map((id, index) => 
        updateDoc(doc(db, this.fieldsCollection, id), { displayOrder: index })
      );
      await Promise.all(promises);
    } catch (error) {
      console.error('Error reordering fields:', error);
      throw error;
    }
  }
}
