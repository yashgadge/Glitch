import { doc, getDoc, collection, setDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../services/firebase';
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
    let parsed: QRPayload;
    try {
      parsed = JSON.parse(payload);
    } catch (e) {
      throw new Error('Invalid QR Format. Ensure you are scanning an official GLITCH 36 Digital Pass.');
    }

    const validId = guardValue(parsed.participantId, 'participantId');
    const validToken = guardValue(parsed.token, 'token');
    
    // 1. Fetch Participant (using ID as Auth UID)
    const participantRef = doc(db, 'participants', validId);
    const participantSnap = await getDoc(participantRef);
    if (!participantSnap.exists()) {
      throw new Error('Participant not found.');
    }
    const participant = participantSnap.data() as Participant;

    // 2. Validate QR Token & Version
    if (participant.qrToken !== validToken) {
      throw new Error('Invalid or expired QR Token.');
    }
    if (parsed.version !== participant.qrVersion) {
      throw new Error('Invalid QR Version. Pass might have been reissued.');
    }

    // 3. Fetch Digital Pass
    const passId = guardValue(participant.digitalPassId, 'digitalPassId');
    const passRef = doc(db, 'digitalPasses', passId);
    const passSnap = await getDoc(passRef);
    if (!passSnap.exists()) {
      throw new Error('Digital Pass not found.');
    }
    const pass = passSnap.data() as DigitalPass;

    // 4. Validate Pass Status
    if (pass.status !== 'active') {
      throw new Error(`Digital Pass is ${pass.status.toUpperCase()}.`);
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
    volunteerName: string
  ): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const participantRef = doc(db, 'participants', participantId);
        const passRef = doc(db, 'digitalPasses', passId);
        
        const participantSnap = await transaction.get(participantRef);
        const passSnap = await transaction.get(passRef);
        
        if (!participantSnap.exists()) throw new Error('Participant not found.');
        
        const participant = participantSnap.data() as Participant;
        
        if (participant.checkedIn) {
          throw new Error('Participant is already checked in.');
        }

        const now = new Date().toISOString();

        transaction.update(participantRef, {
          checkedIn: true,
          checkedInAt: now,
          checkedInBy: volunteerId,
          status: 'checked_in',
          updatedAt: now
        });

        if (passSnap.exists()) {
          const pass = passSnap.data() as DigitalPass;
          transaction.update(passRef, {
            lastScannedAt: now,
            lastScannedBy: volunteerId,
            scanCount: (pass.scanCount || 0) + 1
          });
        }

        // Scan Log
        const logRef = doc(collection(db, this.scanLogCollection));
        transaction.set(logRef, {
          token,
          participantId,
          passId,
          volunteerId,
          scannerUser: volunteerName,
          scannerRole: 'volunteer',
          purpose: 'General Check-in',
          location: 'Main Gate',
          deviceId: navigator.userAgent,
          timestamp: now,
          result: 'success',
          reason: 'approve',
          networkStatus: navigator.onLine ? 'online' : 'offline'
        });

        // Audit Log
        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          action: 'CHECK_IN_APPROVED',
          targetId: participantId,
          actorId: volunteerId,
          actorRole: 'volunteer',
          resourceType: 'participant',
          timestamp: now
        });
      });
    } catch (error) {
      console.error('Error approving check-in:', error);
      throw error;
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
      await runTransaction(db, async (transaction) => {
        const participantRef = doc(db, 'participants', participantId);
        const participantSnap = await transaction.get(participantRef);
        
        if (!participantSnap.exists()) throw new Error('Participant not found.');
        
        const participant = participantSnap.data() as Participant;
        if (!participant.checkedIn) {
          throw new Error('Participant is not checked in.');
        }

        const now = new Date().toISOString();

        transaction.update(participantRef, {
          checkedIn: false,
          checkedInAt: null,
          checkedInBy: null,
          status: 'ready_for_checkin',
          updatedAt: now
        });

        // Scan Log
        const logRef = doc(collection(db, this.scanLogCollection));
        transaction.set(logRef, {
          token,
          participantId,
          passId,
          volunteerId,
          scannerUser: volunteerName,
          scannerRole: 'volunteer',
          purpose: 'Undo Check-in',
          location: 'Main Gate',
          deviceId: navigator.userAgent,
          timestamp: now,
          result: 'undo',
          reason: 'undo',
          networkStatus: navigator.onLine ? 'online' : 'offline'
        });

        // Audit Log
        const auditRef = doc(collection(db, 'auditLogs'));
        transaction.set(auditRef, {
          action: 'CHECK_IN_UNDONE',
          targetId: participantId,
          actorId: volunteerId,
          actorRole: 'volunteer',
          resourceType: 'participant',
          timestamp: now
        });
      });
    } catch (error) {
      console.error('Error undoing check-in:', error);
      throw error;
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
}
