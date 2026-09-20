import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { EventConfig } from '../types/models';
import { AuditService } from './AuditService';

export class EventConfigService {
  private static documentPath = 'system/eventConfig';

  /**
   * Subscribe to the global Event Configuration.
   */
  static subscribeToConfig(callback: (config: EventConfig | null) => void): () => void {
    const docRef = doc(db, this.documentPath);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as EventConfig);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error("Error subscribing to event config:", error);
      callback(null);
    });
  }

  /**
   * Admin-only: Update the event configuration.
   */
  static async updateConfig(updates: Partial<EventConfig>, adminId: string): Promise<void> {
    try {
      const docRef = doc(db, this.documentPath);
      await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });

      await AuditService.logAction({
        actorId: adminId,
        actorRole: 'super_admin',
        action: 'UPDATE_EVENT_CONFIG',
        targetId: 'master',
        resourceType: 'system',
        metadata: { updates }
      });
    } catch (error) {
      console.error("Error updating event config:", error);
      throw error;
    }
  }
}
