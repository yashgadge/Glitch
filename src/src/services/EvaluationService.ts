import { collection, doc, getDoc, getDocs, onSnapshot, query, where, setDoc, updateDoc, addDoc, orderBy, runTransaction, limit, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { guardValue } from '../lib/firestoreGuard';
import type { Evaluation } from '../types/models';

export interface CriterionTemplate {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
  order: number;
  enabled: boolean;
}

export class EvaluationService {
  private static collectionName = 'evaluations';
  private static configCollectionName = 'evaluationConfig';

  /**
   * Subscribe to evaluation criteria. Provides default fallbacks if none exist.
   */
  static subscribeToCriteria(callback: (criteria: CriterionTemplate[]) => void): () => void {
    const q = query(collection(db, this.configCollectionName), orderBy('order', 'asc'));
    return onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Fallback defaults - write them to DB automatically
        const defaults: CriterionTemplate[] = [
          { id: 'innovation', name: 'Innovation', maxScore: 10, order: 1, enabled: true },
          { id: 'tech_impl', name: 'Technical Implementation', maxScore: 10, order: 2, enabled: true },
          { id: 'ui_ux', name: 'UI / UX', maxScore: 10, order: 3, enabled: true },
          { id: 'presentation', name: 'Presentation', maxScore: 10, order: 4, enabled: true },
          { id: 'scalability', name: 'Scalability', maxScore: 10, order: 5, enabled: true },
        ];
        
        try {
          const batch = writeBatch(db);
          defaults.forEach(c => {
            const docRef = doc(db, this.configCollectionName, c.id);
            batch.set(docRef, c);
          });
          await batch.commit();
        } catch (err) {
          console.error('Failed to initialize default criteria:', err);
        }
        
        callback(defaults);
        return;
      }
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CriterionTemplate));
      callback(data);
    }, (error) => {
      console.error('Error subscribing to evaluation criteria:', error);
      callback([]);
    });
  }

  /**
   * Check if criteria are locked (i.e. if any evaluation exists).
   */
  static async isCriteriaLocked(): Promise<boolean> {
    try {
      const q = query(collection(db, this.collectionName), limit(1));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (err) {
      console.error("Error checking criteria lock status:", err);
      return true; // fail safe
    }
  }

  /**
   * Update criteria templates in batch. 
   * Fails if criteria are locked.
   */
  static async updateCriteria(criteria: CriterionTemplate[]): Promise<void> {
    const locked = await this.isCriteriaLocked();
    if (locked) {
      throw new Error("Evaluation criteria are locked because scoring has already begun.");
    }
    
    try {
      const batch = writeBatch(db);
      criteria.forEach(c => {
        const docRef = doc(db, this.configCollectionName, c.id);
        batch.set(docRef, c);
      });
      await batch.commit();
    } catch (err) {
      console.error("Failed to update criteria:", err);
      throw err;
    }
  }

  /**
   * Subscribe to all evaluations for a specific team in a specific round.
   */
  static subscribeToTeamEvaluations(teamId: string, roundId: number, callback: (evaluations: Evaluation[]) => void): () => void {
    const validTeamId = guardValue(teamId, 'teamId');
    const validRoundId = guardValue(roundId, 'roundId');
    const q = query(
      collection(db, this.collectionName), 
      where('teamId', '==', validTeamId),
      where('roundId', '==', validRoundId)
    );
    return onSnapshot(q, (snapshot) => {
      const evaluations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation));
      callback(evaluations);
    }, (error) => {
      console.error(`Error subscribing to evaluations for team ${teamId}:`, error);
      callback([]);
    });
  }

  /**
   * Subscribe to all evaluations for a specific judge.
   */
  static subscribeToJudgeEvaluations(judgeId: string, callback: (evaluations: Evaluation[]) => void): () => void {
    const validJudgeId = guardValue(judgeId, 'judgeId');
    const q = query(
      collection(db, this.collectionName), 
      where('judgeId', '==', validJudgeId)
    );
    return onSnapshot(q, (snapshot) => {
      const evaluations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation));
      callback(evaluations);
    }, (error) => {
      console.error(`Error subscribing to evaluations for judge ${judgeId}:`, error);
      callback([]);
    });
  }

  /**
   * Fetch a specific judge's evaluation for a team.
   */
  static async getJudgeEvaluation(judgeId: string, teamId: string, roundId: number): Promise<Evaluation | null> {
    try {
      const evalId = `${judgeId}_${teamId}_${roundId}`;
      const docRef = doc(db, this.collectionName, evalId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Evaluation;
      }
      return null;
    } catch (error) {
      console.error("Error getting judge evaluation:", error);
      return null;
    }
  }

  /**
   * Fetch a team's evaluations (all judges) for a round.
   */
  static async getTeamEvaluation(teamId: string, roundId: number): Promise<Evaluation | null> {
    try {
      const validTeamId = guardValue(teamId, 'teamId');
      const validRoundId = guardValue(roundId, 'roundId');
      const q = query(
        collection(db, this.collectionName), 
        where('teamId', '==', validTeamId),
        where('roundId', '==', validRoundId)
      );
      // Wait, there might be multiple judges evaluating a team.
      // For JudgeHome progress bar, we just want to know if *this judge* evaluated it.
      // So I will just use getJudgeEvaluation instead in JudgeHome, and remove getTeamEvaluation to avoid confusion.
      throw new Error("Use getJudgeEvaluation if you want a specific judge's evaluation, or getTeamEvaluations for all.");
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  /**
   * Create or update a judge's evaluation. Submitting it locks the evaluation automatically.
   */
  static async submitEvaluation(evaluation: Omit<Evaluation, 'id' | 'timestamp' | 'locked' | 'version'>): Promise<void> {
    try {
      const evalId = `${evaluation.judgeId}_${evaluation.teamId}_${evaluation.roundId}`;
      const docRef = doc(db, this.collectionName, evalId);
      
      let finalEvaluation: any;
      await runTransaction(db, async (transaction) => {
        const currentDoc = await transaction.get(docRef);
        const currentVersion = currentDoc.exists() ? currentDoc.data().version : 0;
        const isLocked = currentDoc.exists() ? currentDoc.data().locked : false;

        if (isLocked) {
          throw new Error("This evaluation is locked and cannot be modified.");
        }

        finalEvaluation = {
          ...evaluation,
          locked: evaluation.status === 'submitted',
          version: currentVersion + 1,
          timestamp: new Date().toISOString()
        };

        transaction.set(docRef, finalEvaluation, { merge: true });
      });

      // Append to Evaluation Versions if locked
      if (finalEvaluation.locked) {
        await addDoc(collection(db, 'evaluationVersions'), {
          evaluationId: evalId,
          versionNumber: finalEvaluation.version,
          criteriaScores: finalEvaluation.criteriaScores,
          totalScore: finalEvaluation.totalScore,
          feedback: finalEvaluation.feedback,
          submittedBy: finalEvaluation.judgeId,
          submittedAt: finalEvaluation.timestamp,
          locked: true
        });
      }
    } catch (error) {
      console.error("Error submitting evaluation:", error);
      throw error;
    }
  }

  /**
   * Admin-only: Unlock an evaluation for edits.
   */
  static async unlockEvaluation(evalId: string, adminId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, evalId);
      const currentDoc = await getDoc(docRef);
      
      if (!currentDoc.exists()) throw new Error("Evaluation not found");

      const data = currentDoc.data();

      // Ensure the unlocked state is recorded as a new version explicitly
      const newVersion = data.version + 1;

      await updateDoc(docRef, { 
        locked: false,
        status: 'draft',
        version: newVersion,
        timestamp: new Date().toISOString()
      });

      await addDoc(collection(db, 'evaluationVersions'), {
        evaluationId: evalId,
        versionNumber: newVersion,
        criteriaScores: data.criteriaScores,
        totalScore: data.totalScore,
        feedback: data.feedback,
        submittedBy: adminId, // Admin who unlocked it
        submittedAt: new Date().toISOString(),
        locked: false,
        reason: 'Admin Unlock'
      });
    } catch (error) {
      console.error("Error unlocking evaluation:", error);
      throw error;
    }
  }
}
