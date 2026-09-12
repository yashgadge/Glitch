import { collection, doc, query, where, onSnapshot, getDoc, orderBy, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import type { RedemptionRecord, Entitlement, RedemptionMethod } from '../types/models';

export class RedemptionService {
  private static collectionName = 'redemptionRecords';
  
  static generateId(): string {
    return `RED-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }

  /**
   * Atomically redeem an entitlement.
   * This guarantees no double-spending of an entitlement by locking the document in a transaction.
   */
  static async redeemEntitlement(
    entitlementId: string | undefined,
    productId: string | undefined,
    participantId: string,
    teamId: string | undefined,
    volunteerUid: string,
    volunteerName: string,
    location: string,
    method: RedemptionMethod,
    quantityToRedeem: number,
    requestId: string
  ): Promise<RedemptionRecord> {
    try {
      const redeemFn = httpsCallable(functions, 'redeemEntitlement');
      const result = await redeemFn({
        entitlementId: entitlementId || null,
        productId: productId || null,
        participantId,
        teamId: teamId || null,
        location,
        method,
        quantityToRedeem,
        requestId
      });
      return result.data as RedemptionRecord;
    } catch (e: any) {
      console.error('Error redeeming entitlement:', e);
      throw new Error(e.message || 'Failed to redeem entitlement.');
    }
  }

  /**
   * Undo a redemption. Restores the quantity to the entitlement.
   */
  static async undoRedemption(redemptionId: string, adminUid: string, reason: string): Promise<void> {
    try {
      const undoFn = httpsCallable(functions, 'undoRedemption');
      await undoFn({ redemptionId, adminUid, reason });
    } catch (e: any) {
      console.error('Error undoing redemption:', e);
      throw new Error(e.message || 'Failed to undo redemption.');
    }
  }

  static subscribeToRecentRedemptions(volunteerUid: string, callback: (records: RedemptionRecord[]) => void, maxRecords = 20): () => void {
    const q = query(
      collection(db, this.collectionName),
      where('volunteerUid', '==', volunteerUid),
      orderBy('timestamp', 'desc'),
      limit(maxRecords)
    );
    return onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RedemptionRecord));
      callback(records);
    });
  }

  /**
   * Subscribe to recent redemptions for a specific volunteer (for their dashboard/history).
   */
  static subscribeToVolunteerRedemptions(volunteerUid: string, callback: (records: RedemptionRecord[]) => void): () => void {
    const q = query(
      collection(db, this.collectionName),
      where('volunteerUid', '==', volunteerUid)
    );
    // Note: in a real app you'd want to index by timestamp and limit, but requiring composite index.
    return onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RedemptionRecord));
      // Sort client-side if no index
      records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(records);
    });
  }
}
