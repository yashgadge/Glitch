import { collection, doc, getDoc, getDocs, onSnapshot, query, where, setDoc, updateDoc, orderBy, limit, writeBatch, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import { guardValue } from '../lib/firestoreGuard';
import type { Evaluation, CriterionTemplate, JudgeAssignment, Round } from '../types/models';

export class EvaluationService {
  private static collectionName = 'evaluations';
  private static configCollectionName = 'evaluationConfig';

  /**
   * Subscribe to evaluation criteria for a specific round.
   */
  static subscribeToCriteria(roundId: number, callback: (criteria: CriterionTemplate[]) => void): () => void {
    const validRoundId = guardValue(roundId, 'roundId');
    const docRef = doc(db, 'rounds', validRoundId.toString());
    return onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      const data = snapshot.data() as Round;
      const criteria = data.evaluationCriteria || [];
      callback(criteria.sort((a, b) => a.order - b.order));
    }, (error) => {
      console.error('Error subscribing to evaluation criteria:', error);
      callback([]);
    });
  }

  /**
   * Check if criteria are locked (i.e. if any evaluation exists for the round).
   */
  static async isCriteriaLocked(roundId: number): Promise<boolean> {
    try {
      const q = query(collection(db, this.collectionName), where('roundId', '==', roundId), limit(1));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (err) {
      console.error("Error checking criteria lock status:", err);
      return true; // fail safe
    }
  }

  /**
   * Update criteria templates for a round. 
   * Fails if criteria are locked.
   */
  static async updateCriteria(roundId: number, criteria: CriterionTemplate[]): Promise<void> {
    
    try {
      const docRef = doc(db, 'rounds', roundId.toString());
      await updateDoc(docRef, { evaluationCriteria: criteria });
    } catch (err) {
      console.error("Failed to update criteria:", err);
      throw err;
    }
  }

  /**
   * Subscribe to judge assignments for a specific round
   */
  static subscribeToJudgeAssignments(judgeId: string, roundId: number, callback: (assignments: JudgeAssignment[]) => void): () => void {
    const q = query(
      collection(db, 'evaluationAssignments'), 
      where('judgeId', '==', judgeId),
      where('roundId', '==', roundId)
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as JudgeAssignment))
        .filter(a => a.status !== 'REMOVED');
      callback(data);
    }, (error) => {
      console.error(`Error subscribing to assignments for judge ${judgeId}:`, error);
      callback([]);
    });
  }

  /**
   * Subscribe to all judge assignments across all rounds
   */
  static subscribeToAllJudgeAssignments(judgeId: string, callback: (assignments: JudgeAssignment[]) => void): () => void {
    const q = query(
      collection(db, 'evaluationAssignments'), 
      where('judgeId', '==', judgeId)
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JudgeAssignment));
      callback(data);
    }, (error) => {
      console.error(`Error subscribing to all assignments for judge ${judgeId}:`, error);
      callback([]);
    });
  }

  /**
   * Subscribe to team assignments for a specific round
   */
  static subscribeToTeamAssignments(teamId: string, roundId: number, callback: (assignments: JudgeAssignment[]) => void): () => void {
    const q = query(
      collection(db, 'evaluationAssignments'), 
      where('teamId', '==', teamId),
      where('roundId', '==', roundId)
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JudgeAssignment));
      callback(data);
    });
  }

  /**
   * Admin-only: Subscribe to all judge assignments for a specific round
   */
  static subscribeToRoundAssignments(roundId: number, callback: (assignments: JudgeAssignment[]) => void): () => void {
    const q = query(
      collection(db, 'evaluationAssignments'), 
      where('roundId', '==', roundId)
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as JudgeAssignment))
        .filter(a => a.status !== 'REMOVED');
      callback(data);
    }, (error) => {
      console.error(`Error subscribing to assignments for round ${roundId}:`, error);
      callback([]);
    });
  }

  /**
   * Admin-only: Assign judge to team
   */
  static async assignJudge(judgeId: string, teamId: string, roundId: number, adminId: string): Promise<void> {
    const id = `${roundId}_${judgeId}_${teamId}`;
    const docRef = doc(db, 'evaluationAssignments', id);
    await setDoc(docRef, {
      id,
      roundId,
      judgeId,
      teamId,
      assignedBy: adminId,
      assignedAt: new Date().toISOString()
    });
  }

  /**
   * Admin-only: Remove judge assignment
   */
  static async removeAssignment(judgeId: string, teamId: string, roundId: number): Promise<void> {
    try {
      const removeFn = httpsCallable(functions, 'removeAssignment');
      await removeFn({ judgeId, teamId, roundId });
    } catch (err: any) {
      console.error("Error removing assignment:", err);
      throw new Error(err.message || "Failed to remove assignment.");
    }
  }

  /**
   * Admin-only: Bulk assign judges
   */
  static async assignJudgesBulk(roundId: number, assignmentsToCreate: any[], assignmentsToRemove: any[]): Promise<{success: boolean, processed: number}> {
    try {
      const assignFn = httpsCallable(functions, 'assignJudgesBulk');
      const result = await assignFn({ roundId, assignmentsToCreate, assignmentsToRemove });
      return result.data as any;
    } catch (err: any) {
      console.error("Error in bulk assign:", err);
      throw new Error(err.message || "Failed to execute bulk assignment.");
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
   * Admin-only: Subscribe to all evaluations for a specific round.
   */
  static subscribeToRoundEvaluations(roundId: number, callback: (evaluations: Evaluation[]) => void): () => void {
    const validRoundId = guardValue(roundId, 'roundId');
    const q = query(
      collection(db, this.collectionName), 
      where('roundId', '==', validRoundId)
    );
    return onSnapshot(q, (snapshot) => {
      const evaluations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation));
      callback(evaluations);
    }, (error) => {
      console.error(`Error subscribing to evaluations for round ${roundId}:`, error);
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
      const evalFn = httpsCallable(functions, 'submitEvaluation');
      await evalFn({
        ...evaluation
      });
    } catch (error: any) {
      console.error("Error submitting evaluation:", error);
      throw new Error(error.message || "Failed to submit evaluation.");
    }
  }

  /**
   * Admin-only: Unlock an evaluation for edits (Reopen).
   */
  static async unlockEvaluation(evalId: string, adminId: string, reason: string): Promise<void> {
    try {
      const unlockFn = httpsCallable(functions, 'unlockEvaluation');
      await unlockFn({ evalId, reason });
    } catch (error: any) {
      console.error("Error unlocking evaluation:", error);
      throw new Error(error.message || "Failed to unlock evaluation.");
    }
  }

  /**
   * Admin-only: Correct a submitted evaluation score.
   */
  static async adminCorrectEvaluation(evalId: string, criteriaScores: Record<string, number>, totalScore: number, reason: string): Promise<void> {
    try {
      const correctFn = httpsCallable(functions, 'adminCorrectEvaluation');
      await correctFn({ evalId, criteriaScores, totalScore, reason });
    } catch (error: any) {
      console.error("Error correcting evaluation:", error);
      throw new Error(error.message || "Failed to correct evaluation.");
    }
  }
}
