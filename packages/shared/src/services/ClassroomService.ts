import { collection, doc, getDoc, getDocs, onSnapshot, query, where, updateDoc, runTransaction, setDoc, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import { guardValue } from '../lib/firestoreGuard';
import type { Classroom, Team } from '../types/models';

export class ClassroomService {
  private static collectionName = 'classrooms';

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

  static subscribeToAllClassrooms(callback: (classrooms: Classroom[]) => void): () => void {
    const q = query(collection(db, this.collectionName));
    return onSnapshot(q, (snapshot) => {
      const classrooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Classroom));
      callback(classrooms);
    }, (error) => {
      console.error("Error subscribing to all classrooms:", error);
      callback([]);
    });
  }

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

  static async getAllClassrooms(): Promise<Classroom[]> {
    try {
      const snapshot = await getDocs(collection(db, this.collectionName));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Classroom));
    } catch (error) {
      console.error("Error getting all classrooms:", error);
      return [];
    }
  }

  static async createClassroom(roomId: string, data: Partial<Classroom>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, roomId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        throw new Error(`Classroom ${roomId} already exists.`);
      }
      
      const classroomData: any = {
        classroomId: roomId,
        roomName: data.roomName || roomId,
        building: data.building || 'Main',
        floor: data.floor || '1',
        capacity: data.capacity || 30,
        status: data.status || 'AVAILABLE',
        assignedCoordinatorIds: data.assignedCoordinatorIds || [],
        assignedStaffIds: data.assignedStaffIds || [],
        teamIds: [],
        currentOccupancy: 0,
        currentRound: 1,
        notes: data.notes || '',
        updatedAt: new Date().toISOString(),
        ...data
      };
      
      await setDoc(docRef, classroomData);
    } catch (error) {
      console.error(`Error creating classroom ${roomId}:`, error);
      throw error;
    }
  }

  static async updateClassroom(roomId: string, data: Partial<Classroom>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, roomId);
      
      if (data.capacity !== undefined) {
        await runTransaction(db, async (transaction) => {
          const roomDoc = await transaction.get(docRef);
          if (!roomDoc.exists()) throw new Error("Classroom not found.");
          const roomData = roomDoc.data();
          const occupiedCount = roomData.currentOccupancy || 0;
          
          if (data.capacity !== undefined && data.capacity < occupiedCount) {
            throw new Error(`Cannot reduce capacity below currently occupied participants (${occupiedCount}).`);
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

  static async assignTeamToClassroom(roomId: string, teamId: string, adminId: string): Promise<void> {
    try {
      const manageFn = httpsCallable(functions, 'manageClassroomTeam');
      await manageFn({ action: 'assign', roomId, teamId });
    } catch (error: any) {
      console.error("Error assigning team to classroom:", error);
      throw new Error(error.message || "Failed to assign team.");
    }
  }

  static async removeTeamFromClassroom(roomId: string, teamId: string, adminId: string): Promise<void> {
    try {
      const manageFn = httpsCallable(functions, 'manageClassroomTeam');
      await manageFn({ action: 'remove', roomId, teamId });
    } catch (error: any) {
      console.error("Error removing team from classroom:", error);
      throw new Error(error.message || "Failed to remove team.");
    }
  }

  static async moveTeamToClassroom(oldRoomId: string, newRoomId: string, teamId: string, adminId: string): Promise<void> {
    try {
      const manageFn = httpsCallable(functions, 'manageClassroomTeam');
      await manageFn({ action: 'move', roomId: newRoomId, teamId, oldRoomId });
    } catch (error: any) {
      console.error("Error moving team to classroom:", error);
      throw new Error(error.message || "Failed to move team.");
    }
  }
}
