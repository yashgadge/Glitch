import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { guardValue } from '../lib/firestoreGuard';
import type { Result, Ranking } from '../types/models';
import { AuditService } from './AuditService';

export class RankingService {
  /**
   * Generates rankings for all teams in a specific round based on their results.
   */
  static async generateRankings(roundId: number, qualificationThreshold: number, adminId: string): Promise<void> {
    try {
      // 1. Fetch all Results for the round
      const validRoundId = guardValue(roundId, 'roundId');
      const q = query(
        collection(db, 'results'),
        where('roundId', '==', validRoundId)
      );

      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Result));

      if (results.length === 0) {
        throw new Error(`No results found for round ${roundId}. Cannot generate rankings.`);
      }

      // 2. Sort teams by roundAverage descending
      results.sort((a, b) => b.roundAverage - a.roundAverage);

      // 3. Process Rankings and Ties
      const rankings: Omit<Ranking, 'id'>[] = [];
      let currentRank = 1;

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const isTied = i > 0 && results[i - 1].roundAverage === result.roundAverage;
        
        if (i > 0 && !isTied) {
          // Only increment rank if not tied with previous. 
          // Note: Standard competition ranking usually jumps (e.g. 1, 2, 2, 4)
          currentRank = i + 1;
        }

        rankings.push({
          teamId: result.teamId,
          roundId: result.roundId,
          rank: currentRank,
          isTied,
          qualified: currentRank <= qualificationThreshold,
          published: false, // Must be published manually
          timestamp: new Date().toISOString()
        });
      }

      // 4. Batch Write Rankings
      const batch = writeBatch(db);
      rankings.forEach(ranking => {
        const rankingId = `${ranking.teamId}_${ranking.roundId}`;
        const docRef = doc(db, 'rankings', rankingId);
        batch.set(docRef, ranking, { merge: true });
      });

      await batch.commit();

      // 5. Audit
      await AuditService.logAction({
        actorId: adminId,
        actorRole: 'super_admin',
        action: 'GENERATE_RANKINGS',
        targetId: `round_${roundId}`,
        resourceType: 'ranking',
        metadata: { teamsRanked: results.length, qualificationThreshold }
      });

    } catch (error) {
      console.error("Error generating rankings:", error);
      throw error;
    }
  }

  /**
   * Admin-only: Publish rankings for a round.
   */
  static async publishRankings(roundId: number, adminId: string): Promise<void> {
    try {
      const validRoundId = guardValue(roundId, 'roundId');
      const q = query(collection(db, 'rankings'), where('roundId', '==', validRoundId));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      const rankings = snapshot.docs.map(d => ({ ref: d.ref, ...d.data() } as Ranking & { ref: any }));
      
      rankings.forEach(ranking => {
        batch.update(ranking.ref, { published: true, timestamp: new Date().toISOString() });
      });

      await batch.commit();

      // Hook: Auto-generate Certificates for Winners/RunnerUps
      try {
        const { CertificateService } = await import('../lib/CertificateService');
        const { TeamService } = await import('./TeamService');
        
        for (const ranking of rankings) {
          if (ranking.rank <= 3) {
            const team = await TeamService.getTeam(ranking.teamId);
            if (team) {
              const certType = ranking.rank === 1 ? 'Winner' : 'RunnerUp';
              for (const memberId of team.memberIds) {
                // Fetch member name to issue certificate
                const { ParticipantService } = await import('./ParticipantService');
                const participant = await ParticipantService.getParticipant(memberId);
                if (participant) {
                  await CertificateService.issueCertificate({
                    ownerId: participant.id,
                    ownerName: participant.name,
                    type: certType,
                    issuedBy: adminId
                  }).catch(e => {
                    if (!e.message.includes('already has a Valid')) {
                      console.error('Auto-cert error:', e);
                    }
                  });
                }
              }
            }
          }
        }
      } catch (certHookError) {
        console.error("Failed to auto-generate certificates during ranking publish:", certHookError);
      }

      await AuditService.logAction({
        actorId: adminId,
        actorRole: 'super_admin',
        action: 'PUBLISH_RANKINGS',
        targetId: `round_${roundId}`,
        resourceType: 'ranking'
      });
    } catch (error) {
      console.error("Error publishing rankings:", error);
      throw error;
    }
  }
}
