import { collection, doc, getDocs, query, where, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { guardValue } from '../lib/firestoreGuard';
import type { Result, Evaluation } from '../types/models';
import { AuditService } from './AuditService';

export class AggregationService {
  /**
   * Reads all locked evaluations for a team in a specific round, calculates averages,
   * and creates a Result document.
   */
  static async generateResult(teamId: string, roundId: number, adminId: string): Promise<void> {
    try {
      // 1. Fetch Evaluations
      const validTeamId = guardValue(teamId, 'teamId');
      const validRoundId = guardValue(roundId, 'roundId');
      const q = query(
        collection(db, 'evaluations'),
        where('teamId', '==', validTeamId),
        where('roundId', '==', validRoundId),
        where('locked', '==', true)
      );

      const snapshot = await getDocs(q);
      const evaluations = snapshot.docs.map(doc => doc.data() as Evaluation);

      if (evaluations.length === 0) {
        throw new Error("No locked evaluations found to aggregate.");
      }

      // 2. Aggregate
      let totalOverallScore = 0;
      const criteriaTotals: Record<string, number> = {};
      
      evaluations.forEach(ev => {
        totalOverallScore += ev.totalScore;
        ev.criteriaScores.forEach(c => {
          if (!criteriaTotals[c.name]) criteriaTotals[c.name] = 0;
          criteriaTotals[c.name] += c.score;
        });
      });

      const numEvals = evaluations.length;
      const roundAverage = totalOverallScore / numEvals;
      
      const criteriaAverages: Record<string, number> = {};
      Object.keys(criteriaTotals).forEach(key => {
        criteriaAverages[key] = criteriaTotals[key] / numEvals;
      });

      // 3. Construct Result
      const resultId = `${teamId}_${roundId}`;
      const result: Omit<Result, 'id'> = {
        teamId,
        roundId,
        criteriaAverages,
        roundAverage,
        overallAverage: roundAverage,
        published: false, // Never published automatically
        timestamp: new Date().toISOString()
      };

      // 4. Save
      await setDoc(doc(db, 'results', resultId), result, { merge: true });

      // 5. Audit
      await AuditService.logAction({
        actorId: adminId,
        actorRole: 'super_admin',
        action: 'GENERATE_RESULT',
        targetId: resultId,
        resourceType: 'result',
        metadata: { numEvaluationsAggregated: numEvals, roundAverage }
      });

    } catch (error) {
      console.error("Error aggregating results:", error);
      throw error;
    }
  }
}
