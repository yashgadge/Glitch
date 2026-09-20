import { collection, doc, onSnapshot, query, where, updateDoc, setDoc, getDocs, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { guardValue } from '../lib/firestoreGuard';
import type { DigitalPass, ScanLog, Participant } from '../types/models';

export class DigitalPassService {
  private static collectionName = 'digitalPasses';
  private static logCollectionName = 'scanLogs';

  /**
   * Generates a cryptographically secure 256-bit entropy token.
   */
  private static generateSecureToken(): string {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    return `GL36-${hex.toUpperCase()}`;
  }

  /**
   * Subscribe to a participant's digital pass.
   */
  static subscribeToPass(participantId: string, callback: (pass: DigitalPass | null) => void): () => void {
    const validParticipantId = guardValue(participantId, 'participantId');
    const q = query(collection(db, this.collectionName), where('participantId', '==', validParticipantId));
    return onSnapshot(q, (snapshot) => {
      // Find the active or latest pass
      if (!snapshot.empty) {
        // Prefer active over other states
        const activeDoc = snapshot.docs.find(d => d.data().status === 'active') || snapshot.docs[0];
        callback({ id: activeDoc.id, ...activeDoc.data() } as DigitalPass);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error(`Error subscribing to digital pass for ${participantId}:`, error);
      callback(null);
    });
  }

  /**
   * Transactionally generates the initial high-entropy digital pass for a participant.
   */
  static generateInitialDigitalPassTransaction(transaction: any, participantId: string): { passRef: any, passData: Omit<DigitalPass, 'id'> } {
    const passRef = doc(collection(db, this.collectionName));
    const token = this.generateSecureToken();

    const passData: Omit<DigitalPass, 'id'> = {
      participantId,
      token,
      status: 'active',
      createdAt: new Date().toISOString(),
      activatedAt: new Date().toISOString(),
      scanCount: 0,
      reissueCount: 0,
      isRevoked: false,
      version: 1
    };

    transaction.set(passRef, passData);

    return { passRef, passData };
  }

  /**
   * Generates a high-entropy digital pass for a participant.
   */
  static async generateDigitalPass(participantId: string): Promise<void> {
    try {
      // Check if one already exists
      const validParticipantId = guardValue(participantId, 'participantId');
      const q = query(collection(db, this.collectionName), where('participantId', '==', validParticipantId), where('status', '==', 'active'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) throw new Error('Active pass already exists.');

      const docRef = doc(collection(db, this.collectionName));
      const token = this.generateSecureToken();

      const passData: Omit<DigitalPass, 'id'> = {
        participantId,
        token,
        status: 'active',
        createdAt: new Date().toISOString(),
        activatedAt: new Date().toISOString(),
        reissueCount: 0,
        isRevoked: false,
        version: 1
      };

      await setDoc(docRef, passData);
    } catch (error) {
      console.error("Error generating pass:", error);
      throw error;
    }
  }

  /**
   * Admin: Reissue pass, invalidating the old one and generating a new token.
   */
  static async reissuePass(passId: string, adminId: string): Promise<void> {
    try {
      const passRef = doc(db, this.collectionName, passId);
      const passSnap = await getDoc(passRef);
      if (!passSnap.exists()) throw new Error("Pass not found");

      const oldData = passSnap.data() as DigitalPass;
      
      // Invalidate old
      await updateDoc(passRef, { status: 'reissued', isRevoked: true });

      // Issue new
      const newRef = doc(collection(db, this.collectionName));
      const newToken = this.generateSecureToken();

      const newData: Omit<DigitalPass, 'id'> = {
        participantId: oldData.participantId,
        token: newToken,
        status: 'active',
        createdAt: new Date().toISOString(),
        activatedAt: new Date().toISOString(),
        reissueCount: (oldData.reissueCount || 0) + 1,
        isRevoked: false,
        version: (oldData.version || 1) + 1
      };

      await setDoc(newRef, newData);

      // Log reissue
      await addDoc(collection(db, 'auditLogs'), {
        action: 'PASS_REISSUED',
        targetId: oldData.participantId,
        adminId,
        oldPassId: passId,
        newPassId: newRef.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error("Error reissuing pass:", error);
      throw error;
    }
  }

  /**
   * Admin: Block pass temporarily.
   */
  static async blockPass(passId: string, reason: string, adminId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, passId), { 
        status: 'blocked',
        blockedReason: reason 
      });
    } catch (error) {
      console.error("Error blocking pass:", error);
      throw error;
    }
  }

  /**
   * Admin: Revoke pass permanently.
   */
  static async revokePass(passId: string, adminId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, passId), { 
        status: 'revoked',
        isRevoked: true 
      });
      
      // Log revoke
      await addDoc(collection(db, 'auditLogs'), {
        action: 'PASS_REVOKED',
        targetId: passId,
        adminId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error revoking pass:", error);
      throw error;
    }
  }

  /**
   * Admin: Restore a revoked or blocked pass.
   */
  static async restorePass(passId: string, adminId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, passId), { 
        status: 'active',
        isRevoked: false,
        blockedReason: null
      });
      
      await addDoc(collection(db, 'auditLogs'), {
        action: 'PASS_RESTORED',
        targetId: passId,
        adminId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error restoring pass:", error);
      throw error;
    }
  }

  /**
   * Scanning Engine Validation
   */
  static async validateScan(token: string, scannerData: { volunteerId: string; scannerUser: string; scannerRole: string; purpose: string; location: string; deviceId: string }): Promise<{ success: boolean; participant?: Participant; reason?: string; pass?: DigitalPass }> {
    const timestamp = new Date().toISOString();
    
    try {
      const validToken = guardValue(token, 'token');
      const q = query(collection(db, this.collectionName), where('token', '==', validToken));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        await this.logScan({ ...scannerData, token, participantId: 'UNKNOWN', passId: 'UNKNOWN', timestamp, result: 'failed', reason: 'Invalid Token', networkStatus: 'online' });
        return { success: false, reason: 'Invalid or unrecognized token.' };
      }

      const passDoc = snapshot.docs[0];
      const passData = passDoc.data() as DigitalPass;

      if (passData.status !== 'active') {
        const reason = passData.status === 'blocked' ? `Blocked: ${passData.blockedReason}` : `Pass is ${passData.status.toUpperCase()}`;
        await this.logScan({ ...scannerData, token, participantId: passData.participantId, passId: passDoc.id, timestamp, result: 'failed', reason, networkStatus: 'online' });
        return { success: false, reason };
      }

      // Fetch participant info
      const participantSnap = await getDoc(doc(db, 'participants', passData.participantId));
      if (!participantSnap.exists()) {
        await this.logScan({ ...scannerData, token, participantId: passData.participantId, passId: passDoc.id, timestamp, result: 'failed', reason: 'Participant not found', networkStatus: 'online' });
        return { success: false, reason: 'Participant data missing.' };
      }

      // Update pass last scanned
      await updateDoc(passDoc.ref, {
        lastScannedAt: timestamp,
        lastScannedBy: scannerData.volunteerId,
        lastScanPurpose: scannerData.purpose
      });

      // Log success
      await this.logScan({ ...scannerData, token, participantId: passData.participantId, passId: passDoc.id, timestamp, result: 'success', networkStatus: 'online' });

      return { success: true, participant: { id: participantSnap.id, ...participantSnap.data() } as Participant, pass: passData };
    } catch (error: any) {
      console.error("Scan validation error:", error);
      return { success: false, reason: error.message || 'System error during validation.' };
    }
  }

  private static async logScan(log: ScanLog): Promise<void> {
    try {
      await addDoc(collection(db, this.logCollectionName), log);
    } catch (e) {
      console.error("Failed to log scan:", e);
    }
  }
}
