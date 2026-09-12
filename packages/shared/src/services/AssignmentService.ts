import { doc, runTransaction, collection, query, where, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Staff, Classroom, Team, AuditLog } from '../types/models';
import { AuditService } from './AuditService';

export class AssignmentService {
  /**
   * Internal helper to log assignment changes inside a transaction
   */
  private static createAuditLogRef(transaction: any, logData: Omit<AuditLog, 'id' | 'timestamp'>) {
    const logRef = doc(collection(db, 'auditLogs'));
    transaction.set(logRef, {
      ...logData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Update staff availability explicitly.
   */
  static async markStaffAvailability(
    staffId: string, 
    status: Staff['availabilityStatus'], 
    reason?: string, 
    until?: string
  ): Promise<void> {
    const staffRef = doc(db, 'staff', staffId);
    await updateDoc(staffRef, {
      availabilityStatus: status,
      availabilityReason: reason || null,
      reservedUntil: until || null,
      updatedAt: new Date().toISOString()
    });
    
    // Non-transactional log for simple updates
    AuditService.logAction({
      actorId: 'system', // Ideally pass current admin user ID
      actorRole: 'organizer',
      action: status === 'AVAILABLE' ? 'STAFF_MARKED_AVAILABLE' : 'STAFF_MARKED_BUSY',
      targetId: staffId,
      resourceType: 'Staff',
      metadata: { reason, until }
    });
  }

  /**
   * Idempotently assign a Class Coordinator to a Classroom.
   * Ensures the classroom exists, staff exists, and is available.
   */
  static async assignClassCoordinator(
    adminId: string,
    staffId: string, 
    roomId: string, 
    isBackup: boolean = false,
    overrideAvailability: boolean = false
  ): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const staffRef = doc(db, 'staff', staffId);
      const roomRef = doc(db, 'classrooms', roomId);

      const staffDoc = await transaction.get(staffRef);
      if (!staffDoc.exists()) throw new Error('Staff member not found');
      
      const roomDoc = await transaction.get(roomRef);
      if (!roomDoc.exists()) throw new Error('Classroom not found');

      const staffData = staffDoc.data() as Staff;
      if (!overrideAvailability && staffData.availabilityStatus === 'UNAVAILABLE') {
        throw new Error('Staff is explicitly unavailable');
      }

      // Update Staff
      transaction.update(staffRef, { 
        assignedClassroom: roomId,
        availabilityStatus: 'BUSY',
        updatedAt: new Date().toISOString()
      });
      
      // Update Classroom
      const roomUpdate: Partial<Classroom> = { updatedAt: new Date().toISOString() };
      if (isBackup) {
        roomUpdate.backupCoordinator = staffId;
      } else {
        roomUpdate.primaryCoordinator = staffId;
        roomUpdate.status = 'ASSIGNED'; // Mark classroom as covered
      }
      transaction.update(roomRef, roomUpdate);

      this.createAuditLogRef(transaction, {
        actorId: adminId,
        actorRole: 'admin',
        action: 'CLASSROOM_ASSIGNED',
        targetId: roomId,
        resourceType: 'Classroom',
        metadata: { staffId, isBackup, previousStatus: staffData.availabilityStatus }
      });
    });
  }

  /**
   * Remove a coordinator from a classroom.
   */
  static async removeClassCoordinator(adminId: string, roomId: string, staffId: string, reason: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const staffRef = doc(db, 'staff', staffId);
      const roomRef = doc(db, 'classrooms', roomId);

      const staffDoc = await transaction.get(staffRef);
      const roomDoc = await transaction.get(roomRef);

      if (staffDoc.exists()) {
        const staffData = staffDoc.data() as Staff;
        // Only clear if it's their current room
        if (staffData.assignedClassroom === roomId) {
          transaction.update(staffRef, { 
            assignedClassroom: null,
            availabilityStatus: 'AVAILABLE', // Release back to pool
            updatedAt: new Date().toISOString()
          });
        }
      }

      if (roomDoc.exists()) {
        const roomData = roomDoc.data() as Classroom;
        const roomUpdate: Partial<Classroom> = { updatedAt: new Date().toISOString() };
        if (roomData.primaryCoordinator === staffId) {
          roomUpdate.primaryCoordinator = null;
          roomUpdate.status = 'AVAILABLE'; // Needs new coordinator
        }
        if (roomData.backupCoordinator === staffId) {
          roomUpdate.backupCoordinator = null;
        }
        transaction.update(roomRef, roomUpdate);
      }

      this.createAuditLogRef(transaction, {
        actorId: adminId,
        actorRole: 'admin',
        action: 'COORDINATOR_REMOVED',
        targetId: roomId,
        resourceType: 'Classroom',
        metadata: { staffId, reason }
      });
    });
  }

  /**
   * Atomically replace one coordinator with another.
   */
  static async replaceClassCoordinator(
    adminId: string, 
    roomId: string, 
    oldStaffId: string, 
    newStaffId: string, 
    reason: string
  ): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const oldStaffRef = doc(db, 'staff', oldStaffId);
      const newStaffRef = doc(db, 'staff', newStaffId);
      const roomRef = doc(db, 'classrooms', roomId);

      const [oldDoc, newDoc, roomDoc] = await Promise.all([
        transaction.get(oldStaffRef),
        transaction.get(newStaffRef),
        transaction.get(roomRef)
      ]);

      if (!newDoc.exists()) throw new Error('Replacement staff not found');
      if (!roomDoc.exists()) throw new Error('Classroom not found');

      const newData = newDoc.data() as Staff;
      if (newData.availabilityStatus === 'UNAVAILABLE') throw new Error('Replacement staff is unavailable');

      // Release old staff
      if (oldDoc.exists() && oldDoc.data().assignedClassroom === roomId) {
        transaction.update(oldStaffRef, { 
          assignedClassroom: null,
          availabilityStatus: 'AVAILABLE',
          updatedAt: new Date().toISOString()
        });
      }

      // Assign new staff
      transaction.update(newStaffRef, {
        assignedClassroom: roomId,
        availabilityStatus: 'BUSY',
        updatedAt: new Date().toISOString()
      });

      // Update classroom
      transaction.update(roomRef, {
        primaryCoordinator: newStaffId,
        status: 'ASSIGNED',
        updatedAt: new Date().toISOString()
      });

      this.createAuditLogRef(transaction, {
        actorId: adminId,
        actorRole: 'admin',
        action: 'CLASSROOM_REASSIGNED',
        targetId: roomId,
        resourceType: 'Classroom',
        metadata: { oldStaffId, newStaffId, reason }
      });
    });
  }

  /**
   * Auto-assign Class Coordinators based on availability.
   * Allows fallback to Volunteers if permitted.
   */
  static async autoAssignCoordinators(
    adminId: string,
    roomIds: string[], 
    fallbackPolicy: 'coordinators_only' | 'coordinators_and_volunteers' | 'any_eligible' = 'coordinators_only',
    overwriteExisting: boolean = false
  ): Promise<{ assigned: number; conflicts: number; unassigned: number }> {
    let assigned = 0;
    let conflicts = 0;
    let unassigned = 0;

    // Fetch all staff
    const staffQuery = query(collection(db, 'staff'), where('availabilityStatus', '==', 'AVAILABLE'));
    const staffSnap = await getDocs(staffQuery);
    let availableStaff = staffSnap.docs.map(d => ({ id: d.id, ...d.data() } as Staff));

    // Sort by role (Class Coordinator first, then Volunteer)
    availableStaff.sort((a, b) => {
      const aRoles = a.roles || (a.role ? [a.role] : []);
      const bRoles = b.roles || (b.role ? [b.role] : []);
      const aIsCoord = aRoles.includes('class_coordinator') ? -1 : 1;
      const bIsCoord = bRoles.includes('class_coordinator') ? -1 : 1;
      if (aIsCoord !== bIsCoord) return aIsCoord - bIsCoord;
      const aIsVol = aRoles.includes('volunteer') ? -1 : 1;
      const bIsVol = bRoles.includes('volunteer') ? -1 : 1;
      return aIsVol - bIsVol;
    });

    for (const roomId of roomIds) {
      try {
        await runTransaction(db, async (transaction) => {
          const roomRef = doc(db, 'classrooms', roomId);
          const roomDoc = await transaction.get(roomRef);
          if (!roomDoc.exists()) throw new Error('skip');

          const roomData = roomDoc.data() as Classroom;
          if (roomData.primaryCoordinator && !overwriteExisting) {
             throw new Error('skip_existing');
          }

          // Find candidate
          let candidateIndex = -1;
          for (let i = 0; i < availableStaff.length; i++) {
            const s = availableStaff[i];
            const roles = s.roles || (s.role ? [s.role] : []);
            const isCoord = roles.includes('class_coordinator');
            const isVol = roles.includes('volunteer');
            
            if (isCoord) { candidateIndex = i; break; }
            if (isVol && fallbackPolicy !== 'coordinators_only') { candidateIndex = i; break; }
            if (fallbackPolicy === 'any_eligible') { candidateIndex = i; break; }
          }

          if (candidateIndex === -1) {
            throw new Error('no_staff');
          }

          const chosenStaff = availableStaff[candidateIndex];
          
          // Re-check staff state in transaction
          const staffRef = doc(db, 'staff', chosenStaff.id);
          const staffDoc = await transaction.get(staffRef);
          if (!staffDoc.exists() || (staffDoc.data() as Staff).availabilityStatus !== 'AVAILABLE') {
            throw new Error('staff_busy');
          }

          // Assign
          transaction.update(staffRef, { assignedClassroom: roomId, availabilityStatus: 'BUSY' });
          transaction.update(roomRef, { primaryCoordinator: chosenStaff.id, status: 'ASSIGNED' });
          
          this.createAuditLogRef(transaction, {
            actorId: adminId,
            actorRole: 'admin',
            action: 'AUTO_ASSIGNMENT_EXECUTED',
            targetId: roomId,
            resourceType: 'Classroom',
            metadata: { staffId: chosenStaff.id, policy: fallbackPolicy }
          });

          // Remove from local array
          availableStaff.splice(candidateIndex, 1);
          assigned++;
        });
      } catch (err: any) {
        if (err.message === 'skip_existing') {
          // Already assigned, we don't count as unassigned if it's already full
        } else if (err.message === 'no_staff') {
          unassigned++;
        } else if (err.message === 'staff_busy') {
          conflicts++;
        }
      }
    }

    return { assigned, conflicts, unassigned };
  }

  // --- Legacy judge assignment included for completeness ---
  static async assignJudge(staffId: string, roundId: number, roomId: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const staffRef = doc(db, 'staff', staffId);
      const roomRef = doc(db, 'classrooms', roomId);

      const staffDoc = await transaction.get(staffRef);
      if (!staffDoc.exists()) throw new Error('Staff member not found');
      
      const roomDoc = await transaction.get(roomRef);
      if (!roomDoc.exists()) throw new Error('Classroom not found');

      transaction.update(staffRef, { 
        assignedClassroom: roomId,
        currentRound: roundId,
        updatedAt: new Date().toISOString()
      });
      
      const roomData = roomDoc.data() as Classroom;
      const assignedMentors = roomData.assignedMentors || [];
      if (!assignedMentors.includes(staffId)) {
        assignedMentors.push(staffId);
        transaction.update(roomRef, { assignedMentors, updatedAt: new Date().toISOString() });
      }
    });
  }
}
