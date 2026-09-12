import { collection, doc, getDocs, query, where, writeBatch, getDoc, orderBy, limit, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { guardValue } from '../lib/firestoreGuard';
import type { Result, Ranking, RankingSnapshot } from '../types/models';
import { AuditService } from './AuditService';

export class RankingService {
  /**
   * Generates rankings for all teams in a specific round based on their results,
   * and creates a RankingSnapshot.
   */
  static async generateRankings(roundId: number, qualificationThreshold: number, adminId: string): Promise<void> {
    try {
      const validRoundId = guardValue(roundId, 'roundId');
      
      // 1. Fetch all Results for the round
      const q = query(collection(db, 'results'), where('roundId', '==', validRoundId));
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Result));

      if (results.length === 0) {
        throw new Error(`No results found for round ${roundId}. Cannot generate rankings.`);
      }

      // 2. Sort teams by roundAverage descending
      results.sort((a, b) => b.roundAverage - a.roundAverage);

      // 3. Fetch existing rankings to calculate rank movement
      const existingRankingsQ = query(collection(db, 'rankings'), where('roundId', '==', validRoundId));
      const existingRankingsSnap = await getDocs(existingRankingsQ);
      const previousRanks = new Map<string, number>();
      existingRankingsSnap.docs.forEach(doc => {
        const r = doc.data() as Ranking;
        previousRanks.set(r.teamId, r.rank);
      });

      // Determine new rankingVersion
      const snapshotsQ = query(collection(db, 'rankingSnapshots'), where('roundId', '==', validRoundId), orderBy('rankingVersion', 'desc'), limit(1));
      const snapshotsSnap = await getDocs(snapshotsQ);
      let newVersion = 1;
      if (!snapshotsSnap.empty) {
        newVersion = (snapshotsSnap.docs[0].data() as RankingSnapshot).rankingVersion + 1;
      }

      // 4. Process Rankings and Ties
      const rankings: Omit<Ranking, 'id'>[] = [];
      const snapshots: Omit<RankingSnapshot, 'id'>[] = [];
      let currentRank = 1;

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const isTied = i > 0 && results[i - 1].roundAverage === result.roundAverage;
        
        if (i > 0 && !isTied) {
          currentRank = i + 1;
        }

        const prevRank = previousRanks.get(result.teamId);
        const rankMovement = prevRank ? prevRank - currentRank : 0; // Positive means rank improved

        rankings.push({
          teamId: result.teamId,
          roundId: result.roundId,
          rank: currentRank,
          previousRank: prevRank || null,
          rankMovement,
          score: result.roundAverage,
          isTied,
          qualified: currentRank <= qualificationThreshold,
          published: false,
          timestamp: new Date().toISOString()
        });

        snapshots.push({
          teamId: result.teamId,
          roundId: result.roundId,
          rankingVersion: newVersion,
          rank: currentRank,
          previousRank: prevRank || null,
          rankMovement,
          score: result.roundAverage,
          qualified: currentRank <= qualificationThreshold,
          timestamp: new Date().toISOString()
        });
      }

      // 5. Batch Write Rankings and Snapshots
      const batch = writeBatch(db);
      
      rankings.forEach(ranking => {
        const rankingId = `${ranking.teamId}_${ranking.roundId}`;
        const docRef = doc(db, 'rankings', rankingId);
        batch.set(docRef, ranking, { merge: true });
      });

      snapshots.forEach(snap => {
        const snapId = `${snap.teamId}_${snap.roundId}_v${snap.rankingVersion}`;
        const docRef = doc(db, 'rankingSnapshots', snapId);
        batch.set(docRef, snap);
      });

      await batch.commit();

      // 6. Audit
      await AuditService.logAction({
        actorId: adminId,
        actorRole: 'super_admin',
        action: 'GENERATE_RANKINGS',
        targetId: `round_${roundId}`,
        resourceType: 'ranking',
        metadata: { teamsRanked: results.length, qualificationThreshold, version: newVersion }
      });

    } catch (error) {
      console.error("Error generating rankings:", error);
      throw error;
    }
  }

  static async publishSnapshot(roundId: number, version: number, adminId: string): Promise<void> {
    try {
      const validRoundId = guardValue(roundId, 'roundId');
      
      // 1. Get the snapshot
      const q = query(collection(db, 'rankingSnapshots'), where('roundId', '==', validRoundId), where('rankingVersion', '==', version));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        throw new Error(`Snapshot version ${version} not found for round ${roundId}.`);
      }

      const batch = writeBatch(db);
      const rankings = snapshot.docs.map(d => d.data() as RankingSnapshot);
      
      // 2. Overwrite the main rankings collection and set published to true
      rankings.forEach(snap => {
        const rankingId = `${snap.teamId}_${snap.roundId}`;
        const docRef = doc(db, 'rankings', rankingId);
        
        batch.set(docRef, {
          teamId: snap.teamId,
          roundId: snap.roundId,
          rank: snap.rank,
          previousRank: snap.previousRank || null,
          rankMovement: snap.rankMovement || 0,
          score: snap.score || 0,
          ...(snap.qualified !== undefined ? { qualified: snap.qualified } : {}),
          published: true,
          timestamp: new Date().toISOString()
        }, { merge: true });
      });

      await batch.commit();

      // Removed automatic certificate generation. Certificates must be issued manually via CertificateService.

      await AuditService.logAction({
        actorId: adminId,
        actorRole: 'super_admin',
        action: 'PUBLISH_RANKINGS',
        targetId: `round_${roundId}`,
        resourceType: 'ranking',
        metadata: { version }
      });
    } catch (error) {
      console.error("Error publishing rankings:", error);
      throw error;
    }
  }
  static subscribeToTeamRanking(teamId: string, roundId: number, onlyPublished: boolean, callback: (ranking: Ranking | null) => void): () => void {
    const validTeamId = guardValue(teamId, 'teamId');
    const validRoundId = guardValue(roundId, 'roundId');
    const q = onlyPublished 
      ? query(collection(db, 'rankings'), where('teamId', '==', validTeamId), where('roundId', '==', validRoundId), where('published', '==', true))
      : query(collection(db, 'rankings'), where('teamId', '==', validTeamId), where('roundId', '==', validRoundId));
      
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        callback({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Ranking);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error(`Error subscribing to ranking for team ${teamId}:`, error);
      callback(null);
    });
  }

  static async getPublishedRankingsForRound(roundId: number): Promise<Ranking[]> {
    const validRoundId = guardValue(roundId, 'roundId');
    const q = query(
      collection(db, 'rankings'), 
      where('roundId', '==', validRoundId),
      where('published', '==', true)
    );
    const snapshot = await getDocs(q);
    const rankings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ranking));
    return rankings.sort((a, b) => a.rank - b.rank);
  }

  static subscribeToPublishedRankingsForRound(roundId: number, callback: (rankings: Ranking[]) => void): () => void {
    const validRoundId = guardValue(roundId, 'roundId');
    const q = query(
      collection(db, 'rankings'), 
      where('roundId', '==', validRoundId),
      where('published', '==', true)
    );
    return onSnapshot(q, (snapshot) => {
      const rankings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ranking));
      callback(rankings.sort((a, b) => a.rank - b.rank));
    });
  }

  static async updateTeamQualification(teamId: string, roundId: number, qualified: boolean, version: number, adminId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      const rankingId = `${teamId}_${roundId}`;
      const rankingRef = doc(db, 'rankings', rankingId);
      batch.update(rankingRef, { 
        qualified,
        updatedAt: new Date().toISOString()
      });

      const snapId = `${teamId}_${roundId}_v${version}`;
      const snapRef = doc(db, 'rankingSnapshots', snapId);
      batch.update(snapRef, {
        qualified
      });
      
      await batch.commit();

      await AuditService.logAction({
        actorId: adminId,
        actorRole: 'super_admin',
        action: 'UPDATE_TEAM_QUALIFICATION',
        targetId: rankingId,
        resourceType: 'ranking',
        metadata: { teamId, roundId, qualified, version }
      });
    } catch (error) {
      console.error(`Error updating qualification for team ${teamId}:`, error);
      throw error;
    }
  }
}
