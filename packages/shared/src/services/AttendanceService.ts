import { doc, getDoc, collection, setDoc, updateDoc, query, orderBy, limit, onSnapshot, getDocs, where } from 'firebase/firestore';
import { runTransaction } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import { guardValue } from '../lib/firestoreGuard';
import type { Participant, DigitalPass, ScanLog, Team, EventConfig } from '../types/models';

export interface QRPayload {
  participantId: string;
  teamId: string;
  token: string;
  version: number;
}

export interface ScanResultDTO {
  participantId: string;
  registrationId: string;
  name: string;
  photoUrl?: string;
  college: string;
  track: string;
  teamId?: string;
  teamName?: string;
  currentRound: number;
  participantStatus: string;
  digitalPassStatus: string;
  checkedIn: boolean;
  lastCheckInTime: string | null;
  currentRank?: number;
  currentClassroom?: string;
  
  // Extra flags for UI logic
  teamEliminated: boolean;
  teamDisqualified: boolean;
  passId: string;
  glitchId: string;
}

export class AttendanceService {
  private static scanLogCollection = 'scanLogs';

  static async fetchScanDetails(payload: string): Promise<ScanResultDTO> {
    let parsed: any;
    let participant: Participant | null = null;
    let pass: DigitalPass | null = null;
    let passId = '';

    try {
      parsed = JSON.parse(payload);
    } catch (e) {
      // Not a JSON. Fallback to manual ID lookup
      const qText = payload.trim();
      if (!qText.includes('{')) {
        const partsRef = collection(db, 'participants');
        let snap = await getDocs(query(partsRef, where('glitchId', '==', qText)));
        
        if (snap.empty) {
            snap = await getDocs(query(partsRef, where('registrationId', '==', qText)));
        }
        
        if (snap.empty) {
            const pDoc = await getDoc(doc(db, 'participants', qText));
            if (pDoc.exists()) participant = { id: pDoc.id, ...pDoc.data() } as Participant;
        } else {
            participant = { id: snap.docs[0].id, ...snap.docs[0].data() } as Participant;
        }

        if (participant) {
           const passesRef = collection(db, 'digitalPasses');
           const passSnap = await getDocs(query(passesRef, where('participantId', '==', participant.id)));
           if (!passSnap.empty) {
              pass = passSnap.docs[0].data() as DigitalPass;
              passId = passSnap.docs[0].id;
           }
        }
      }
    }

    if (!participant && parsed) {
      const validToken = guardValue(parsed?.token, 'token');
      
      const passesRef = collection(db, 'digitalPasses');
      const q = query(passesRef, where('token', '==', validToken));
      const passesSnap = await getDocs(q);
      
      if (passesSnap.empty) {
        throw new Error('Invalid or unrecognized Digital Pass.');
      }
      
      const passDoc = passesSnap.docs[0];
      pass = passDoc.data() as DigitalPass;
      passId = passDoc.id;

      const participantRef = doc(db, 'participants', pass.participantId);
      const participantSnap = await getDoc(participantRef);
      if (!participantSnap.exists()) {
        throw new Error('Participant not found.');
      }
      participant = { id: participantSnap.id, ...participantSnap.data() } as Participant;
    }

    if (!participant || !pass) {
       throw new Error('Invalid QR Format or Participant not found. Ensure you are scanning an official GLITCH 36 Digital Pass.');
    }

    if (pass.status !== 'active') {
      throw new Error(pass.status === 'blocked' ? `Pass Blocked: ${pass.blockedReason}` : `Pass is ${pass.status.toUpperCase()}`);
    }

    if (pass.isRevoked) {
      throw new Error('Pass Revoked.');
    }

    // Event Config Check Removed as per requirements

    // 6. Fetch Team
    let team: Team | undefined;
    if (participant.teamId) {
      const teamRef = doc(db, 'teams', participant.teamId);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
        team = teamSnap.data() as Team;
      } else {
        throw new Error('Team not found.');
      }
    }

    if (team && (team.eliminated || team.disqualified)) {
       // We still return data but we must flag it. The UI can display "Team Eliminated".
    }

    return {
      participantId: participant.id,
      glitchId: participant.glitchId,
      registrationId: participant.registrationId || 'N/A',
      name: participant.name,
      college: participant.college || 'N/A',
      track: team?.track || 'N/A',
      teamId: team?.id,
      teamName: team?.name,
      currentRound: team?.currentRound || 0,
      participantStatus: participant.status || 'unknown',
      digitalPassStatus: pass.status,
      checkedIn: participant.checkedIn || false,
      lastCheckInTime: participant.checkedInAt || null,
      currentRank: team?.rank,
      currentClassroom: team?.assignedRoom,
      teamEliminated: team?.eliminated || false,
      teamDisqualified: team?.disqualified || false,
      passId: pass.id
    };
  }

  static async approveCheckIn(
    participantId: string,
    passId: string,
    token: string,
    volunteerId: string,
    volunteerName: string,
    teamId?: string
  ): Promise<void> {
    try {
      const checkInFn = httpsCallable(functions, 'checkInParticipant');
      await checkInFn({
        participantId,
        teamId: teamId || 'N/A', // Assuming teamId is passed if they have one
        passToken: token,
        gateId: 'Main Gate'
      });
    } catch (error: any) {
      console.error('Check-in failed:', error);
      throw new Error(error.message || 'Failed to approve check-in.');
    }
  }

  static async undoCheckIn(
    participantId: string,
    passId: string,
    token: string,
    volunteerId: string,
    volunteerName: string
  ): Promise<void> {
    try {
      const undoFn = httpsCallable(functions, 'undoCheckInParticipant');
      await undoFn({
        participantId,
        passId,
        volunteerId
      });
    } catch (error: any) {
      console.error('Error undoing check-in:', error);
      throw new Error(error.message || 'Failed to undo check-in.');
    }
  }

  static async rejectCheckIn(
    participantId: string,
    passId: string,
    token: string,
    volunteerId: string,
    volunteerName: string,
    reason: string
  ): Promise<void> {
    try {
      // Reject does NOT modify Participant
      const now = new Date().toISOString();
      
      const logRef = doc(collection(db, this.scanLogCollection));
      await setDoc(logRef, {
        token,
        participantId,
        passId,
        volunteerId,
        scannerUser: volunteerName,
        scannerRole: 'volunteer',
        purpose: 'Check-in Rejected',
        location: 'Main Gate',
        deviceId: navigator.userAgent,
        timestamp: now,
        result: 'rejected',
        reason,
        networkStatus: navigator.onLine ? 'online' : 'offline'
      });

      const auditRef = doc(collection(db, 'auditLogs'));
      await setDoc(auditRef, {
        action: 'CHECK_IN_REJECTED',
        targetId: participantId,
        actorId: volunteerId,
        actorRole: 'volunteer',
        resourceType: 'scanLog',
        metadata: { reason },
        timestamp: now
      });
    } catch (error) {
      console.error('Error logging rejected check-in:', error);
      throw error;
    }
  }

  static async revokePass(passId: string, adminId: string, reason: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const passRef = doc(db, 'digitalPasses', passId);
        const passDoc = await transaction.get(passRef);
        if (!passDoc.exists()) throw new Error('Pass not found');
        
        transaction.update(passRef, {
          isRevoked: true,
          status: 'revoked',
          blockedReason: reason
        });

        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          action: 'PASS_REVOKED',
          targetId: passId,
          actorId: adminId,
          actorRole: 'volunteer',
          resourceType: 'digitalPass',
          metadata: { reason },
          timestamp: new Date().toISOString()
        });
      });
    } catch (e) {
      console.error('Error revoking pass:', e);
      throw e;
    }
  }

  static subscribeToRecentScanLogs(callback: (logs: ScanLog[]) => void, maxLogs: number = 50): () => void {
    const q = query(
      collection(db, this.scanLogCollection),
      orderBy('timestamp', 'desc'),
      limit(maxLogs)
    );
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScanLog));
      callback(logs);
    });
  }

  static async fetchAttendanceStats(): Promise<{ expected: number, checkedIn: number, pending: number }> {
    // This is an approximation for UI purposes. In a real scenario, this might be aggregated in a backend stats document.
    const partsRef = collection(db, 'participants');
    // For expected, we just assume active non-eliminated participants.
    const partsSnap = await getDocs(partsRef);
    let expected = 0;
    let checkedIn = 0;
    
    partsSnap.docs.forEach(doc => {
      const p = doc.data() as Participant;
      if (!p.deleted) {
        expected++;
        if (p.checkedIn) checkedIn++;
      }
    });
    
    return {
      expected,
      checkedIn,
      pending: expected - checkedIn
    };
  }
}
