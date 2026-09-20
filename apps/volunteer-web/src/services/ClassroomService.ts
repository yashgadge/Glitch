import { collection, doc, getDoc, getDocs, onSnapshot, query, where, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../services/firebase';
import { guardValue } from '../lib/firestoreGuard';
import type { Classroom, SeatingPlanEntry } from '../types/models';

export class ClassroomService {
  private static collectionName = 'classrooms';

  /**
   * Subscribe to a single classroom's document in realtime.
   */
  static subscribeToClassroom(roomId: string, callback: (classroom: Classroom | null) => void): () => void {
    const docRef = doc(db, this.collectionName, roomId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as Classroom);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error(`Error subscribing to classroom ${roomId}:`, error);
      callback(null);
    });
  }

  /**
   * Subscribe to all classrooms assigned to a specific volunteer.
   */
  static subscribeToVolunteerClassrooms(volunteerId: string, callback: (classrooms: Classroom[]) => void): () => void {
    const validVolunteerId = guardValue(volunteerId, 'volunteerId');
    const q = query(
      collection(db, this.collectionName),
      where('assignedVolunteers', 'array-contains', validVolunteerId),
      where('status', '==', 'active')
    );
    return onSnapshot(q, (snapshot) => {
      const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Classroom));
      callback(rooms);
    }, (error) => {
      console.error(`Error subscribing to classrooms for volunteer ${volunteerId}:`, error);
      callback([]);
    });
  }

  /**
   * Fetch a classroom once.
   */
  static async getClassroom(roomId: string): Promise<Classroom | null> {
    try {
      const docRef = doc(db, this.collectionName, roomId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Classroom;
      }
      return null;
    } catch (error) {
      console.error(`Error getting classroom ${roomId}:`, error);
      return null;
    }
  }

  /**
   * Fetch all classrooms.
   */
  static async getAllClassrooms(): Promise<Classroom[]> {
    try {
      const snapshot = await getDocs(collection(db, this.collectionName));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Classroom));
    } catch (error) {
      console.error("Error getting all classrooms:", error);
      return [];
    }
  }

  /**
   * Update classroom fields.
   */
  static async updateClassroom(roomId: string, data: Partial<Classroom>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, roomId);
      
      // Enforce capacity rule: cannot reduce capacity below currently occupied seats
      if (data.capacity !== undefined || data.rows !== undefined || data.columns !== undefined) {
        await runTransaction(db, async (transaction) => {
          const roomDoc = await transaction.get(docRef);
          if (!roomDoc.exists()) throw new Error("Classroom not found.");
          const roomData = roomDoc.data() as Classroom;
          const occupiedCount = (roomData.seatingPlan || []).filter(s => s.teamId).length;
          
          if (data.capacity !== undefined && data.capacity < occupiedCount) {
            throw new Error(`Cannot reduce capacity below currently occupied seats (${occupiedCount}).`);
          }
          
          transaction.update(docRef, { ...data, updatedAt: new Date().toISOString() });
        });
      } else {
        await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
      }
    } catch (error) {
      console.error(`Error updating classroom ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Assign a team to a specific seat.
   */
  static async assignSeat(roomId: string, seatId: string, teamId: string): Promise<void> {
    const roomRef = doc(db, this.collectionName, roomId);
    await runTransaction(db, async (transaction) => {
      const roomDoc = await transaction.get(roomRef);
      if (!roomDoc.exists()) throw new Error("Classroom not found.");
      
      const classroom = roomDoc.data() as Classroom;
      const seatingPlan = [...(classroom.seatingPlan || [])];
      
      // Validation 1: Capacity check
      const occupiedSeats = seatingPlan.filter(s => s.teamId).length;
      const targetSeatIndex = seatingPlan.findIndex(s => s.seatId === seatId);
      const isTargetOccupied = targetSeatIndex !== -1 && seatingPlan[targetSeatIndex].teamId;
      
      if (!isTargetOccupied && occupiedSeats >= classroom.capacity) {
        throw new Error("Cannot assign beyond classroom capacity.");
      }

      // Validation 2: Duplicate seat assignment for same team
      if (seatingPlan.some(s => s.teamId === teamId)) {
        throw new Error("Team is already assigned to a seat in this classroom.");
      }

      // Validation 3: Duplicate seat check (is someone already in THIS seat?)
      if (isTargetOccupied) {
        throw new Error("This seat is already occupied.");
      }

      if (targetSeatIndex !== -1) {
        seatingPlan[targetSeatIndex].teamId = teamId;
      } else {
        seatingPlan.push({ seatId, teamId });
      }

      transaction.update(roomRef, { seatingPlan, updatedAt: new Date().toISOString() });
      
      // Update team document
      const teamRef = doc(db, 'teams', teamId);
      transaction.update(teamRef, { assignedRoom: roomId, assignedSeat: seatId, updatedAt: new Date().toISOString() });
    });
  }

  /**
   * Remove a team from a seat.
   */
  static async removeSeat(roomId: string, seatId: string): Promise<void> {
    const roomRef = doc(db, this.collectionName, roomId);
    await runTransaction(db, async (transaction) => {
      const roomDoc = await transaction.get(roomRef);
      if (!roomDoc.exists()) throw new Error("Classroom not found.");
      
      const classroom = roomDoc.data() as Classroom;
      const seatingPlan = [...(classroom.seatingPlan || [])];
      
      const targetSeatIndex = seatingPlan.findIndex(s => s.seatId === seatId);
      if (targetSeatIndex === -1 || !seatingPlan[targetSeatIndex].teamId) return;

      const teamId = seatingPlan[targetSeatIndex].teamId;
      seatingPlan[targetSeatIndex].teamId = null;

      transaction.update(roomRef, { seatingPlan, updatedAt: new Date().toISOString() });
      
      // Update team document
      if (teamId) {
        const teamRef = doc(db, 'teams', teamId);
        transaction.update(teamRef, { assignedRoom: null, assignedSeat: null, updatedAt: new Date().toISOString() });
      }
    });
  }

  /**
   * Swap two seats in the same classroom.
   */
  static async swapSeats(roomId: string, seatId1: string, seatId2: string): Promise<void> {
    const roomRef = doc(db, this.collectionName, roomId);
    await runTransaction(db, async (transaction) => {
      const roomDoc = await transaction.get(roomRef);
      if (!roomDoc.exists()) throw new Error("Classroom not found.");
      
      const classroom = roomDoc.data() as Classroom;
      const seatingPlan = [...(classroom.seatingPlan || [])];
      
      let index1 = seatingPlan.findIndex(s => s.seatId === seatId1);
      let index2 = seatingPlan.findIndex(s => s.seatId === seatId2);

      if (index1 === -1) {
        seatingPlan.push({ seatId: seatId1, teamId: null });
        index1 = seatingPlan.length - 1;
      }
      if (index2 === -1) {
        seatingPlan.push({ seatId: seatId2, teamId: null });
        index2 = seatingPlan.length - 1;
      }

      const team1 = seatingPlan[index1].teamId;
      const team2 = seatingPlan[index2].teamId;

      seatingPlan[index1].teamId = team2;
      seatingPlan[index2].teamId = team1;

      transaction.update(roomRef, { seatingPlan, updatedAt: new Date().toISOString() });
      
      if (team1) {
        const teamRef1 = doc(db, 'teams', team1);
        transaction.update(teamRef1, { assignedSeat: seatId2, updatedAt: new Date().toISOString() });
      }
      if (team2) {
        const teamRef2 = doc(db, 'teams', team2);
        transaction.update(teamRef2, { assignedSeat: seatId1, updatedAt: new Date().toISOString() });
      }
    });
  }

  /**
   * Auto generate blank seats based on rows and columns.
   */
  static async generateSeats(roomId: string, rows: number, columns: number): Promise<void> {
    const roomRef = doc(db, this.collectionName, roomId);
    await runTransaction(db, async (transaction) => {
      const roomDoc = await transaction.get(roomRef);
      if (!roomDoc.exists()) throw new Error("Classroom not found.");
      
      const classroom = roomDoc.data() as Classroom;
      const existingPlan = classroom.seatingPlan || [];
      const occupiedSeats = existingPlan.filter(s => s.teamId).length;
      
      const newCapacity = rows * columns;
      if (newCapacity < occupiedSeats) {
        throw new Error(`Cannot shrink capacity below occupied seats (${occupiedSeats}).`);
      }

      const newPlan: SeatingPlanEntry[] = [];
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

      for (let r = 0; r < rows; r++) {
        const rowLabel = alphabet[r % 26];
        for (let c = 1; c <= columns; c++) {
          const seatId = `${rowLabel}${c}`;
          const existing = existingPlan.find(s => s.seatId === seatId);
          newPlan.push(existing ? existing : { seatId, teamId: null });
        }
      }

      transaction.update(roomRef, { 
        seatingPlan: newPlan, 
        rows, 
        columns, 
        capacity: newCapacity,
        updatedAt: new Date().toISOString() 
      });
    });
  }

  /**
   * Bulk auto assign unassigned teams to empty seats sequentially.
   */
  static async bulkAutoAssign(roomId: string, teamIds: string[]): Promise<void> {
    const roomRef = doc(db, this.collectionName, roomId);
    await runTransaction(db, async (transaction) => {
      const roomDoc = await transaction.get(roomRef);
      if (!roomDoc.exists()) throw new Error("Classroom not found.");
      
      const classroom = roomDoc.data() as Classroom;
      const seatingPlan = [...(classroom.seatingPlan || [])];
      
      let teamIndex = 0;
      for (let i = 0; i < seatingPlan.length; i++) {
        if (teamIndex >= teamIds.length) break;
        if (!seatingPlan[i].teamId) {
          seatingPlan[i].teamId = teamIds[teamIndex];
          const teamRef = doc(db, 'teams', teamIds[teamIndex]);
          transaction.update(teamRef, { assignedRoom: roomId, assignedSeat: seatingPlan[i].seatId, updatedAt: new Date().toISOString() });
          teamIndex++;
        }
      }

      if (teamIndex < teamIds.length) {
        throw new Error(`Not enough available seats in the classroom. ${teamIds.length - teamIndex} teams were not assigned.`);
      }

      transaction.update(roomRef, { seatingPlan, updatedAt: new Date().toISOString() });
    });
  }

  /**
   * Remove all teams from their seats in a classroom.
   */
  static async resetSeats(roomId: string): Promise<void> {
    const roomRef = doc(db, this.collectionName, roomId);
    await runTransaction(db, async (transaction) => {
      const roomDoc = await transaction.get(roomRef);
      if (!roomDoc.exists()) throw new Error("Classroom not found.");
      
      const classroom = roomDoc.data() as Classroom;
      const seatingPlan = [...(classroom.seatingPlan || [])];
      
      for (const seat of seatingPlan) {
        if (seat.teamId) {
          const teamRef = doc(db, 'teams', seat.teamId);
          transaction.update(teamRef, { assignedRoom: null, assignedSeat: null, updatedAt: new Date().toISOString() });
          seat.teamId = null;
        }
      }

      transaction.update(roomRef, { seatingPlan, updatedAt: new Date().toISOString() });
    });
  }
}
