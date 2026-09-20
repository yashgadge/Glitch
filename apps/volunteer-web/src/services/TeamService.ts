import { collection, doc, getDoc, getDocs, onSnapshot, query, where, updateDoc, writeBatch, runTransaction } from 'firebase/firestore';
import { db } from '../services/firebase';
import { guardValue } from '../lib/firestoreGuard';
import type { Team } from '../types/models';

export class TeamService {
  private static collectionName = 'teams';

  static subscribeToTeam(teamId: string, callback: (team: Team | null) => void): () => void {
    const docRef = doc(db, this.collectionName, teamId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as Team);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error(`Error subscribing to team ${teamId}:`, error);
      callback(null);
    });
  }

  static subscribeToTeamsInRoom(roomId: string, callback: (teams: Team[]) => void): () => void {
    const validRoomId = guardValue(roomId, 'roomId');
    const q = query(collection(db, this.collectionName), where('assignedRoom', '==', validRoomId));
    return onSnapshot(q, (snapshot) => {
      const teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)).filter(t => t.status !== 'eliminated' && t.status !== 'disqualified');
      callback(teams);
    }, (error) => {
      console.error(`Error subscribing to teams in room ${roomId}:`, error);
      callback([]);
    });
  }

  /**
   * Subscribe to all teams.
   */
  static subscribeToAllTeams(callback: (teams: Team[]) => void): () => void {
    const q = query(collection(db, this.collectionName));
    return onSnapshot(q, (snapshot) => {
      const teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      callback(teams);
    }, (error) => {
      console.error('Error subscribing to all teams:', error);
      callback([]);
    });
  }

  static async getTeam(teamId: string): Promise<Team | null> {
    try {
      const docRef = doc(db, this.collectionName, teamId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Team;
      }
      return null;
    } catch (error) {
      console.error(`Error getting team ${teamId}:`, error);
      return null;
    }
  }

  static async getAllTeams(): Promise<Team[]> {
    try {
      const snapshot = await getDocs(collection(db, this.collectionName));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
    } catch (error) {
      console.error("Error getting all teams:", error);
      return [];
    }
  }

  static async updateTeam(teamId: string, data: Partial<Team>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, teamId);
      await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error(`Error updating team ${teamId}:`, error);
      throw error;
    }
  }

  // --- New Client-Side Transactional Operations ---

  static async createTeam(name: string, track: string, creatorId: string): Promise<string> {
    try {
      const teamRef = doc(collection(db, this.collectionName));
      const participantRef = doc(db, 'participants', creatorId);
      
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const teamData = {
        name,
        track,
        leaderId: creatorId,
        members: [creatorId],
        inviteCode,
        status: 'registered',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const batch = writeBatch(db);
      batch.set(teamRef, teamData);
      batch.update(participantRef, { teamId: teamRef.id });
      
      await batch.commit();
      return teamRef.id;
    } catch (error) {
      console.error("Error creating team:", error);
      throw error;
    }
  }

  static async adminCreateOrJoinTeam(name: string, code: string, participantId: string, track: string): Promise<string> {
    try {
      const validName = guardValue(name, 'name');
      const validCode = guardValue(code, 'code');
      
      const q = query(collection(db, this.collectionName), where('name', '==', validName), where('code', '==', validCode));
      const snapshot = await getDocs(q);
      
      let teamId = '';
      
      await runTransaction(db, async (transaction) => {
        const participantRef = doc(db, 'participants', participantId);
        
        if (!snapshot.empty) {
          // Join existing team
          teamId = snapshot.docs[0].id;
          const teamRef = doc(db, this.collectionName, teamId);
          const teamDoc = await transaction.get(teamRef);
          
          if (teamDoc.exists()) {
            const teamData = teamDoc.data() as Team;
            if (!teamData.memberIds.includes(participantId)) {
              transaction.update(teamRef, { 
                memberIds: [...teamData.memberIds, participantId],
                updatedAt: new Date().toISOString()
              });
            }
          }
        } else {
          // Create new team
          const teamRef = doc(collection(db, this.collectionName));
          teamId = teamRef.id;
          
          const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          const teamData: Omit<Team, 'id'> = {
            name: validName,
            code: validCode,
            track,
            leaderId: participantId,
            memberIds: [participantId],
            inviteCode,
            status: 'registered',
            currentRound: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          transaction.set(teamRef, teamData);
        }
        
        // Update participant
        transaction.update(participantRef, { teamId });
      });
      
      return teamId;
    } catch (error) {
      console.error("Error in adminCreateOrJoinTeam:", error);
      throw error;
    }
  }

  static async joinTeam(inviteCode: string, participantId: string): Promise<string> {
    try {
      // 1. Find team by invite code (query outside transaction)
      const validInviteCode = guardValue(inviteCode, 'inviteCode');
      const q = query(collection(db, this.collectionName), where('inviteCode', '==', validInviteCode), where('status', '!=', 'locked'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        throw new Error("Invalid or locked invite code.");
      }
      
      const teamId = snapshot.docs[0].id;

      // 2. Run transaction to safely add member
      await runTransaction(db, async (transaction) => {
        const teamRef = doc(db, this.collectionName, teamId);
        const participantRef = doc(db, 'participants', participantId);
        
        const teamDoc = await transaction.get(teamRef);
        if (!teamDoc.exists()) {
          throw new Error("Team does not exist.");
        }
        
        const teamData = teamDoc.data() as Team;
        
        if (teamData.members.length >= 4) {
          throw new Error("Team is full.");
        }
        
        if (teamData.members.includes(participantId)) {
          throw new Error("You are already in this team.");
        }

        transaction.update(teamRef, { 
          members: [...teamData.members, participantId],
          updatedAt: new Date().toISOString()
        });
        transaction.update(participantRef, { teamId });
      });
      
      return teamId;
    } catch (error) {
      console.error("Error joining team:", error);
      throw error;
    }
  }

  static async leaveTeam(teamId: string, participantId: string): Promise<void> {
    try {
      const teamRef = doc(db, this.collectionName, teamId);
      const participantRef = doc(db, 'participants', participantId);
      
      const snapshot = await getDoc(teamRef);
      if (!snapshot.exists()) throw new Error("Team not found.");
      
      const teamData = snapshot.data() as Team;
      
      if (teamData.status === 'locked') {
        throw new Error("Cannot leave a locked team.");
      }
      
      if (teamData.leaderId === participantId) {
        throw new Error("Leader cannot leave the team. Transfer leadership or disband first.");
      }

      const batch = writeBatch(db);
      batch.update(teamRef, { 
        members: teamData.members.filter(id => id !== participantId),
        updatedAt: new Date().toISOString()
      });
      batch.update(participantRef, { teamId: null });
      
      await batch.commit();
    } catch (error) {
      console.error("Error leaving team:", error);
      throw error;
    }
  }
  // --- Lifecycle Operations ---

  static async promoteTeam(teamId: string, nextRound: number, nextStatus: TeamStatus, adminId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const teamRef = doc(db, this.collectionName, teamId);
        const teamDoc = await transaction.get(teamRef);
        if (!teamDoc.exists()) throw new Error("Team not found");
        
        const teamData = teamDoc.data() as Team;
        if (teamData.status === 'eliminated' || teamData.status === 'disqualified' || teamData.status === 'winner') {
          throw new Error(`Cannot promote a team with status: ${teamData.status}`);
        }

        const updates: Partial<Team> = {
          previousRound: teamData.currentRound,
          currentRound: nextRound,
          status: nextStatus,
          lastStatusUpdate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        transaction.update(teamRef, updates);

        // Audit log
        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          action: 'TEAM_PROMOTED',
          targetId: teamId,
          actorId: adminId,
          actorRole: 'admin',
          resourceType: 'team',
          metadata: { fromRound: teamData.currentRound, toRound: nextRound, status: nextStatus },
          timestamp: new Date().toISOString()
        });
      });
    } catch (error) {
      console.error("Error promoting team:", error);
      throw error;
    }
  }

  static async advanceTeam(teamId: string, actorId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const teamRef = doc(db, this.collectionName, teamId);
        const teamDoc = await transaction.get(teamRef);
        if (!teamDoc.exists()) throw new Error("Team not found");
        
        const teamData = teamDoc.data() as Team;
        if (teamData.status === 'eliminated' || teamData.status === 'disqualified') {
          throw new Error("Cannot advance an eliminated or disqualified team");
        }

        const nextRound = (teamData.currentRound || 0) + 1;
        const newStatus = nextRound >= 1 ? `round_${nextRound}` : 'qualified';

        transaction.update(teamRef, {
          currentRound: nextRound,
          previousRound: teamData.currentRound || 0,
          status: newStatus as any,
          qualified: true,
          lastStatusUpdate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          action: 'TEAM_ADVANCED',
          targetId: teamId,
          actorId,
          actorRole: 'system',
          resourceType: 'team',
          metadata: { fromRound: teamData.currentRound || 0, toRound: nextRound },
          timestamp: new Date().toISOString()
        });
      });
    } catch (error) {
      console.error("Error advancing team:", error);
      throw error;
    }
  }

  static async returnTeam(teamId: string, actorId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const teamRef = doc(db, this.collectionName, teamId);
        const teamDoc = await transaction.get(teamRef);
        if (!teamDoc.exists()) throw new Error("Team not found");
        
        const teamData = teamDoc.data() as Team;
        if ((teamData.currentRound || 0) <= 0) {
          throw new Error("Team is already at the starting round");
        }

        const prevRound = (teamData.currentRound || 1) - 1;
        const newStatus = prevRound >= 1 ? `round_${prevRound}` : 'qualified';

        transaction.update(teamRef, {
          currentRound: prevRound,
          previousRound: teamData.currentRound || 1,
          status: newStatus as any,
          lastStatusUpdate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          action: 'TEAM_RETURNED',
          targetId: teamId,
          actorId,
          actorRole: 'system',
          resourceType: 'team',
          metadata: { fromRound: teamData.currentRound || 1, toRound: prevRound },
          timestamp: new Date().toISOString()
        });
      });
    } catch (error) {
      console.error("Error returning team:", error);
      throw error;
    }
  }

  static async holdTeam(teamId: string, actorId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const teamRef = doc(db, this.collectionName, teamId);
        const teamDoc = await transaction.get(teamRef);
        if (!teamDoc.exists()) throw new Error("Team not found");

        transaction.update(teamRef, {
          status: 'held',
          lastStatusUpdate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          action: 'TEAM_HELD',
          targetId: teamId,
          actorId,
          actorRole: 'system',
          resourceType: 'team',
          timestamp: new Date().toISOString()
        });
      });
    } catch (error) {
      console.error("Error holding team:", error);
      throw error;
    }
  }

  static async eliminateTeam(teamId: string, reason: string, adminId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const teamRef = doc(db, this.collectionName, teamId);
        const teamDoc = await transaction.get(teamRef);
        if (!teamDoc.exists()) throw new Error("Team not found");
        
        const teamData = teamDoc.data() as Team;
        if (teamData.status === 'winner' || teamData.status === 'eliminated') {
          throw new Error("Cannot eliminate a winner or already eliminated team");
        }

        const updates: Partial<Team> = {
          status: 'eliminated',
          eliminated: true,
          eliminatedAt: new Date().toISOString(),
          eliminatedBy: adminId,
          eliminationReason: reason,
          lastStatusUpdate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        transaction.update(teamRef, updates);

        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          action: 'TEAM_ELIMINATED',
          targetId: teamId,
          actorId: adminId,
          actorRole: 'admin',
          resourceType: 'team',
          metadata: { reason, round: teamData.currentRound },
          timestamp: new Date().toISOString()
        });
      });
    } catch (error) {
      console.error("Error eliminating team:", error);
      throw error;
    }
  }

  static async disqualifyTeam(teamId: string, reason: string, adminId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const teamRef = doc(db, this.collectionName, teamId);
        const teamDoc = await transaction.get(teamRef);
        if (!teamDoc.exists()) throw new Error("Team not found");

        const updates: Partial<Team> = {
          status: 'disqualified',
          disqualified: true,
          disqualifiedBy: adminId,
          disqualifiedReason: reason,
          lastStatusUpdate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        transaction.update(teamRef, updates);

        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          action: 'TEAM_DISQUALIFIED',
          targetId: teamId,
          actorId: adminId,
          actorRole: 'admin',
          resourceType: 'team',
          metadata: { reason },
          timestamp: new Date().toISOString()
        });
      });
    } catch (error) {
      console.error("Error disqualifying team:", error);
      throw error;
    }
  }

  static async restoreTeam(teamId: string, adminId: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const teamRef = doc(db, this.collectionName, teamId);
        const teamDoc = await transaction.get(teamRef);
        if (!teamDoc.exists()) throw new Error("Team not found");
        
        const teamData = teamDoc.data() as Team;
        if (!teamData.eliminated && !teamData.disqualified) {
          throw new Error("Team is not eliminated or disqualified");
        }

        // Restore to previous round state (or default to 'registered' if none)
        // For simplicity, we can restore to 'qualified' or whatever logic, but we'll try to infer from currentRound
        let restoredStatus: TeamStatus = 'registered';
        if (teamData.currentRound >= 1) {
          restoredStatus = `round_${teamData.currentRound}` as TeamStatus;
        }

        transaction.update(teamRef, {
          status: restoredStatus,
          eliminated: false,
          eliminatedAt: null,
          eliminatedBy: null,
          eliminationReason: null,
          disqualified: false,
          disqualifiedBy: null,
          disqualifiedReason: null,
          lastStatusUpdate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          action: 'TEAM_RESTORED',
          targetId: teamId,
          actorId: adminId,
          actorRole: 'super_admin',
          resourceType: 'team',
          timestamp: new Date().toISOString()
        });
      });
    } catch (error) {
      console.error("Error restoring team:", error);
      throw error;
    }
  }

}
