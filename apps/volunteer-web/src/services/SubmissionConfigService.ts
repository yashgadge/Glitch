import { collection, doc, setDoc, getDocs, updateDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { SubmissionField } from '../types/models';

export class SubmissionConfigService {
  private static collectionName = 'submissionConfig';

  static subscribeToConfig(callback: (fields: SubmissionField[]) => void): () => void {
    return onSnapshot(collection(db, this.collectionName), (snapshot) => {
      const fields = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubmissionField));
      // Sort by display order
      fields.sort((a, b) => a.displayOrder - b.displayOrder);
      callback(fields);
    }, (error) => {
      console.error('Error subscribing to submission config:', error);
      callback([]);
    });
  }

  static async getConfig(): Promise<SubmissionField[]> {
    try {
      const snapshot = await getDocs(collection(db, this.collectionName));
      const fields = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubmissionField));
      return fields.sort((a, b) => a.displayOrder - b.displayOrder);
    } catch (error) {
      console.error('Error fetching submission config:', error);
      throw error;
    }
  }

  static async addField(field: Omit<SubmissionField, 'id'>): Promise<void> {
    try {
      const docRef = doc(collection(db, this.collectionName));
      await setDoc(docRef, { ...field, id: docRef.id });
    } catch (error) {
      console.error('Error adding submission field:', error);
      throw error;
    }
  }

  static async updateField(fieldId: string, updates: Partial<SubmissionField>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, fieldId);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating submission field:', error);
      throw error;
    }
  }

  static async deleteField(fieldId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, fieldId));
    } catch (error) {
      console.error('Error deleting submission field:', error);
      throw error;
    }
  }

  static async reorderFields(fieldIds: string[]): Promise<void> {
    try {
      const promises = fieldIds.map((id, index) => 
        updateDoc(doc(db, this.collectionName, id), { displayOrder: index })
      );
      await Promise.all(promises);
    } catch (error) {
      console.error('Error reordering fields:', error);
      throw error;
    }
  }
}
