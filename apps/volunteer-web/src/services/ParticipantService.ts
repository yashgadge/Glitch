
import { collection, doc, getDoc, getDocs, onSnapshot, query, where, updateDoc, runTransaction } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../services/firebase';
import { guardValue } from '../lib/firestoreGuard';
import type { Participant, Staff } from '../types/models';

import { DigitalPassService } from './DigitalPassService';
import { AuditService } from './AuditService';

export class ParticipantService {
  private static collectionName = 'participants';
  private static staffCollectionName = 'staff';

  /**
   * Subscribe to a single participant's document in realtime.
   */
  static subscribeToParticipant(uid: string, callback: (participant: Participant | null) => void): () => void {
    const docRef = doc(db, this.collectionName, uid);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as Participant);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error(`Error subscribing to participant ${uid}:`, error);
      callback(null);
    });
  }

  /**
   * Subscribe to all participants on a specific team.
   */
  static subscribeToTeamMembers(teamId: string, callback: (participants: Participant[]) => void): () => void {
    const validTeamId = guardValue(teamId, 'teamId');
    const q = query(collection(db, this.collectionName), where('teamId', '==', validTeamId));
    return onSnapshot(q, (snapshot) => {
      const participants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant));
      callback(participants);
    }, (error) => {
      console.error(`Error subscribing to team members for team ${teamId}:`, error);
      callback([]);
    });
  }

  /**
   * Fetch a participant once (no subscription).
   */
  static async getParticipant(uid: string): Promise<Participant | null> {
    try {
      const docRef = doc(db, this.collectionName, uid);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Participant;
      }
      return null;
    } catch (error) {
      console.error(`Error getting participant ${uid}:`, error);
      return null;
    }
  }

  /**
   * Fetch all participants (e.g. for Admin dashboards).
   * Note: For very large datasets, pagination should be used.
   */
  static async getAllParticipants(): Promise<Participant[]> {
    try {
      const q = query(collection(db, this.collectionName), where('role', '==', 'participant'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant));
    } catch (error) {
      console.error("Error getting all participants:", error);
      return [];
    }
  }

  static subscribeToAllParticipants(callback: (participants: Participant[]) => void): () => void {
    const q = query(collection(db, this.collectionName), where('role', '==', 'participant'));
    return onSnapshot(q, (snapshot) => {
      const participants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant));
      callback(participants);
    }, (error) => {
      console.error("Error subscribing to all participants:", error);
      callback([]);
    });
  }

  static async createParticipantWithCounter(uid: string, participantData: Omit<Participant, 'id' | 'participantId'>): Promise<string> {
    const counterRef = doc(db, 'counters', 'participant');
    let participantId = '';
    
    await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let newCount = 1;
      
      if (!counterDoc.exists()) {
        transaction.set(counterRef, { participantCount: 1 });
      } else {
        newCount = (counterDoc.data().participantCount || 0) + 1;
        transaction.update(counterRef, { participantCount: newCount });
      }
      
      participantId = `GL26-P-${newCount.toString().padStart(6, '0')}`;
      
      const { passRef, passData } = DigitalPassService.generateInitialDigitalPassTransaction(transaction, uid);
      
      transaction.set(doc(db, this.collectionName, uid), {
        ...participantData,
        participantId,
        digitalPassId: passRef.id,
        qrToken: passData.token,
        qrCreatedAt: passData.createdAt,
        qrVersion: passData.version,
        status: participantData.status || 'imported',
        createdAt: new Date().toISOString()
      });
    });
    
    return uid;
  }

  static async transitionStatus(uid: string, newStatus: string, actorId: string, metadata?: any): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, uid);
      await updateDoc(docRef, { 
        status: newStatus, 
        updatedAt: new Date().toISOString() 
      });
      await AuditService.logAction(actorId, 'volunteer', `Participant ${newStatus}`, uid, 'participant', metadata);
    } catch (e) {
      console.error(`Error transitioning status for ${uid}:`, e);
      throw e;
    }
  }

  // --- Staff Management Methods ---

  static subscribeToAllStaff(callback: (staff: Staff[]) => void): () => void {
    const q = query(collection(db, this.staffCollectionName));
    return onSnapshot(q, (snapshot) => {
      const staffList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
      callback(staffList);
    }, (error) => {
      console.error('Error subscribing to staff:', error);
      callback([]);
    });
  }



  static async updateStaffRecord(uid: string, data: Partial<Staff>): Promise<void> {
    try {
      const docRef = doc(db, this.staffCollectionName, uid);
      await updateDoc(docRef, data);
    } catch (error) {
      console.error('Error updating staff record:', error);
      throw error;
    }
  }

  /**
   * Update participant fields.
   */
  static async updateParticipant(uid: string, data: Partial<Participant>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, uid);
      await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
      
      if (data.status === 'approved') {
        try {
          const { DigitalPassService } = await import('./DigitalPassService');
          await DigitalPassService.generateDigitalPass(uid);
        } catch (passError: any) {
          if (passError.message !== 'Active pass already exists.') {
            console.error(`Failed to auto-generate digital pass for ${uid}:`, passError);
          }
        }
      }
    } catch (error) {
      console.error(`Error updating participant ${uid}:`, error);
      throw error;
    }
  }

  /** Send email to participant using callable function */
  static async sendEmail(uid: string, template: string): Promise<void> {
    try {
      const functions = getFunctions();
      const sendEmailFn = httpsCallable(functions, 'sendParticipantEmail');
      await sendEmailFn({ uid, template });
    } catch (error) {
      console.error(`Error sending email to participant ${uid}:`, error);
      throw error;
    }
  }

  /** Get existing QR token (DOES NOT dynamically generate) */
  static async getOrCreateQr(uid: string): Promise<string> {
    try {
      const docRef = doc(db, this.collectionName, uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as Participant;
        if (data.qrToken) return data.qrToken;
      }
      throw new Error(`QR Token not found for participant ${uid}. Dynamic generation is disabled.`);
    } catch (error) {
      console.error(`Error getting QR for participant ${uid}:`, error);
      throw error;
    }
  }

  /** Soft delete participant */
  static async softDeleteParticipant(uid: string, adminId: string): Promise<void> {
    try {
      const participantRef = doc(db, this.collectionName, uid);
      await runTransaction(db, async (transaction) => {
        transaction.update(participantRef, {
          deleted: true,
          deletedAt: new Date().toISOString(),
          deletedBy: adminId,
          status: 'suspended'
        });
      });
    } catch (error) {
      console.error(`Error soft deleting participant ${uid}:`, error);
      throw error;
    }
  }

  /** Permanent delete participant via callable function */
  static async permanentDeleteParticipant(uid: string, adminId: string): Promise<void> {
    try {
      const functions = getFunctions();
      const deleteFn = httpsCallable(functions, 'permanentDeleteParticipant');
      await deleteFn({ uid, adminId });
    } catch (error) {
      console.error(`Error permanently deleting participant ${uid}:`, error);
      throw error;
    }
  }
}
