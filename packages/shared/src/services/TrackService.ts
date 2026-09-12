import { collection, doc, setDoc, getDocs, getDoc, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Track, ProblemStatement } from '../types/models';

export class TrackService {
  static async createTrack(track: Omit<Track, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const trackRef = doc(collection(db, 'tracks'));
    const now = new Date().toISOString();
    
    await setDoc(trackRef, {
      ...track,
      id: trackRef.id,
      createdAt: now,
      updatedAt: now,
    });
    
    return trackRef.id;
  }

  static async updateTrack(id: string, updates: Partial<Omit<Track, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const trackRef = doc(db, 'tracks', id);
    await updateDoc(trackRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  static async deleteTrack(id: string): Promise<void> {
    // Delete the track
    await deleteDoc(doc(db, 'tracks', id));
    // Also delete all associated problem statements
    const q = query(collection(db, 'problemStatements'), where('trackId', '==', id));
    const querySnapshot = await getDocs(q);
    const deletePromises = querySnapshot.docs.map(docSnapshot => deleteDoc(docSnapshot.ref));
    await Promise.all(deletePromises);
  }

  static subscribeToTracks(callback: (tracks: Track[]) => void): () => void {
    const q = query(collection(db, 'tracks'));
    return onSnapshot(q, (snapshot) => {
      const tracks = snapshot.docs.map(doc => doc.data() as Track);
      callback(tracks);
    }, (error) => {
      console.error('Error subscribing to tracks:', error);
      callback([]);
    });
  }

  // --- Problem Statements ---

  static async createProblemStatement(ps: Omit<ProblemStatement, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const psRef = doc(collection(db, 'problemStatements'));
    const now = new Date().toISOString();
    
    await setDoc(psRef, {
      ...ps,
      id: psRef.id,
      createdAt: now,
      updatedAt: now,
    });
    
    return psRef.id;
  }

  static async updateProblemStatement(id: string, updates: Partial<Omit<ProblemStatement, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const psRef = doc(db, 'problemStatements', id);
    await updateDoc(psRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  static async deleteProblemStatement(id: string): Promise<void> {
    await deleteDoc(doc(db, 'problemStatements', id));
  }

  static subscribeToProblemStatements(trackId: string | null, callback: (ps: ProblemStatement[]) => void, onlyReleased = false): () => void {
    const conditions = [];
    if (trackId) {
      conditions.push(where('trackId', '==', trackId));
    }
    if (onlyReleased) {
      conditions.push(where('isReleased', '==', true)); // kept for backward compatibility if data exists
      // Wait, in new schema, we also should check published==true but isReleased can be used for now as an OR or AND
    }

    const q = conditions.length > 0 ? query(collection(db, 'problemStatements'), ...conditions) : query(collection(db, 'problemStatements'));
    return onSnapshot(q, (snapshot) => {
      const statements = snapshot.docs.map(doc => doc.data() as ProblemStatement);
      // Client side filter for new schema if needed
      const filtered = onlyReleased ? statements.filter(s => s.isReleased || s.published) : statements;
      callback(filtered);
    }, (error) => {
      console.error('Error subscribing to problem statements:', error);
      callback([]);
    });
  }
}
