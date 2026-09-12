import { collection, doc, query, where, onSnapshot, getDocs, setDoc, updateDoc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Entitlement, CatalogItemType, EntitlementType, EntitlementOwnership, CatalogItem } from '../types/models';

export class EntitlementService {
  private static collectionName = 'entitlements';
  
  /**
   * Generates a unique ID for an entitlement.
   */
  static generateId(): string {
    return `ENT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }

  /**
   * Subscribe to all active entitlements for a participant (including team entitlements if they are on a team).
   */
  static subscribeToParticipantEntitlements(participantId: string, teamId: string | undefined | null, callback: (entitlements: Entitlement[]) => void): () => void {
    if (!participantId) {
      callback([]);
      return () => {};
    }

    // Subscribe to Participant Entitlements
    const qPart = query(
      collection(db, this.collectionName),
      where('participantId', '==', participantId),
      where('status', '==', 'active')
    );

    let participantEnts: Entitlement[] = [];
    let teamEnts: Entitlement[] = [];

    const notify = () => {
      callback([...participantEnts, ...teamEnts]);
    };

    const unsubPart = onSnapshot(qPart, (snapshot) => {
      participantEnts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entitlement));
      notify();
    });

    let unsubTeam = () => {};
    if (teamId) {
      const qTeam = query(
        collection(db, this.collectionName),
        where('teamId', '==', teamId),
        where('status', '==', 'active')
      );
      unsubTeam = onSnapshot(qTeam, (snapshot) => {
        teamEnts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entitlement));
        notify();
      });
    }

    return () => {
      unsubPart();
      unsubTeam();
    };
  }

  /**
   * Aggregates multiple entitlements of the same productId into a single summary view.
   */
  static aggregateEntitlements(entitlements: Entitlement[]): Entitlement[] {
    const aggregated = new Map<string, Entitlement>();
    
    for (const ent of entitlements) {
      if (!aggregated.has(ent.productId)) {
        aggregated.set(ent.productId, { ...ent });
      } else {
        const existing = aggregated.get(ent.productId)!;
        existing.quantityPurchased += ent.quantityPurchased;
        existing.quantityRemaining += ent.quantityRemaining;
        existing.quantityUsed += ent.quantityUsed;
      }
    }
    
    return Array.from(aggregated.values());
  }

  /**
   * Grant a new entitlement manually or from an order webhook.
   */
  static async grantEntitlement(
    participantId: string,
    teamId: string | undefined,
    productId: string,
    quantity: number,
    adminId: string,
    orderId?: string
  ): Promise<void> {
    try {
      const productSnap = await getDoc(doc(db, 'system/eventConfig'));
      let product: CatalogItem | undefined;
      
      if (productSnap.exists()) {
        const config = productSnap.data();
        if (config.catalog) {
          product = config.catalog.find((c: CatalogItem) => c.id === productId);
        }
      }
      
      if (!product) throw new Error('Product not found in catalog.');
      
      const entitlementType = product.entitlementType || 'QUANTITY_BASED';
      const ownership = product.ownership || 'PARTICIPANT';
      
      const entId = this.generateId();
      const now = new Date().toISOString();
      
      const entitlement: Entitlement = {
        id: entId,
        productId: product.id,
        productNameSnapshot: product.name,
        category: product.type,
        entitlementType,
        ownership,
        quantityPurchased: quantity,
        quantityUsed: 0,
        quantityRemaining: quantity,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        orderId,
      };
      
      if (ownership === 'TEAM') {
        if (!teamId) throw new Error('Cannot grant team entitlement to participant with no team.');
        entitlement.teamId = teamId;
      } else {
        entitlement.participantId = participantId;
      }
      
      await setDoc(doc(db, this.collectionName, entId), entitlement);
      
      // Audit log
      await setDoc(doc(collection(db, 'auditLogs')), {
        action: 'ENTITLEMENT_GRANTED',
        targetId: entId,
        actorId: adminId,
        actorRole: 'admin',
        resourceType: 'entitlement',
        metadata: { productId, quantity, participantId, teamId },
        timestamp: now
      });
    } catch (e) {
      console.error('Error granting entitlement:', e);
      throw e;
    }
  }

  /**
   * Adjust remaining quantity manually (Admin override).
   */
  static async adjustEntitlement(entitlementId: string, newQuantityRemaining: number, adminId: string, reason: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const entRef = doc(db, this.collectionName, entitlementId);
        const entSnap = await transaction.get(entRef);
        if (!entSnap.exists()) throw new Error('Entitlement not found.');
        
        const oldData = entSnap.data() as Entitlement;
        
        transaction.update(entRef, {
          quantityRemaining: newQuantityRemaining,
          updatedAt: new Date().toISOString()
        });
        
        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          action: 'ENTITLEMENT_ADJUSTED',
          targetId: entitlementId,
          actorId: adminId,
          actorRole: 'admin',
          resourceType: 'entitlement',
          metadata: { 
            oldQuantity: oldData.quantityRemaining, 
            newQuantity: newQuantityRemaining,
            reason 
          },
          timestamp: new Date().toISOString()
        });
      });
    } catch (e) {
      console.error('Error adjusting entitlement:', e);
      throw e;
    }
  }

  /**
   * Revoke an entitlement completely.
   */
  static async revokeEntitlement(entitlementId: string, adminId: string, reason: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const entRef = doc(db, this.collectionName, entitlementId);
        const entSnap = await transaction.get(entRef);
        if (!entSnap.exists()) throw new Error('Entitlement not found.');
        
        transaction.update(entRef, {
          status: 'revoked',
          updatedAt: new Date().toISOString()
        });
        
        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          action: 'ENTITLEMENT_REVOKED',
          targetId: entitlementId,
          actorId: adminId,
          actorRole: 'admin',
          resourceType: 'entitlement',
          metadata: { reason },
          timestamp: new Date().toISOString()
        });
      });
    } catch (e) {
      console.error('Error revoking entitlement:', e);
      throw e;
    }
  }
}
