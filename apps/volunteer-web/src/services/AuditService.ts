import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { AuditLog } from '../types/models';

export class AuditService {
  private static collectionName = 'auditLogs';

  /**
   * Log an administrative or significant action.
   */
  static async logAction(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      // In production, this might be restricted to Cloud Functions
      // but for client-driven apps, we write it securely if rules allow.
      await addDoc(collection(db, this.collectionName), {
        ...log,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error writing audit log:", error);
      // We usually don't throw here to avoid breaking the main UI flow if audit fails
    }
  }

  /**
   * Subscribe to logs for a specific target (e.g. participant timeline)
   */
  static getLogsForTarget(targetId: string, callback: (logs: AuditLog[]) => void): () => void {
    if (!targetId) {
      callback([]);
      return () => {};
    }
    
    // In production we should use orderBy('timestamp', 'desc'), but that requires an index.
    // For now we fetch and sort on client.
    const q = query(
      collection(db, this.collectionName), 
      where('targetId', '==', targetId)
    );
    
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AuditLog[];
      
      // Sort descending (newest first)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      callback(logs);
    }, (error) => {
      console.error(`Error fetching audit logs for ${targetId}:`, error);
      callback([]);
    });
  }
}
