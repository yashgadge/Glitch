import { collection, doc, addDoc, getDoc, getDocs, onSnapshot, query, where, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { guardValue } from '../lib/firestoreGuard';
import type { HelpRequest, JudgeIssue, IssueCategory, HelpRequestStatus } from '../types/models';

export class HelpService {
  /**
   * Submit an issue flagged by a judge
   */
  static async submitIssue(judgeId: string, teamId: string, roundId: number, category: IssueCategory, details: string): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'judgeIssues'), {
        judgeId: guardValue(judgeId, 'judgeId'),
        teamId: guardValue(teamId, 'teamId'),
        roundId: guardValue(roundId, 'roundId'),
        category,
        details,
        status: 'OPEN',
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (err) {
      console.error('Failed to submit issue:', err);
      throw err;
    }
  }

  /**
   * Request help from an admin
   */
  static async requestHelp(judgeId: string, judgeName: string, roundId: number, message: string, teamId?: string): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'helpRequests'), {
        judgeId: guardValue(judgeId, 'judgeId'),
        judgeName,
        roundId: guardValue(roundId, 'roundId'),
        message,
        teamId: teamId || null,
        status: 'OPEN',
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (err) {
      console.error('Failed to request help:', err);
      throw err;
    }
  }

  /**
   * Admin: Resolve a help request
   */
  static async resolveHelpRequest(requestId: string, adminId: string, response?: string): Promise<void> {
    const docRef = doc(db, 'helpRequests', requestId);
    await updateDoc(docRef, {
      status: 'RESOLVED',
      adminResponse: response || null,
      resolvedByUid: adminId,
      resolvedAt: new Date().toISOString()
    });
  }

  /**
   * Admin: Resolve a judge issue
   */
  static async resolveIssue(issueId: string, adminId: string, response?: string): Promise<void> {
    const docRef = doc(db, 'judgeIssues', issueId);
    await updateDoc(docRef, {
      status: 'RESOLVED',
      adminResponse: response || null,
      resolvedByUid: adminId,
      resolvedAt: new Date().toISOString()
    });
  }

  /**
   * Subscribe to help requests for a judge
   */
  static subscribeToJudgeHelpRequests(judgeId: string, callback: (requests: HelpRequest[]) => void): () => void {
    const q = query(
      collection(db, 'helpRequests'),
      where('judgeId', '==', judgeId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HelpRequest));
      callback(requests);
    });
  }

  /**
   * Subscribe to issues flagged by a judge
   */
  static subscribeToJudgeIssues(judgeId: string, callback: (issues: JudgeIssue[]) => void): () => void {
    const q = query(
      collection(db, 'judgeIssues'),
      where('judgeId', '==', judgeId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JudgeIssue));
      callback(issues);
    });
  }

  /**
   * Admin: Subscribe to all OPEN help requests
   */
  static subscribeToOpenHelpRequests(callback: (requests: HelpRequest[]) => void): () => void {
    const q = query(
      collection(db, 'helpRequests'),
      where('status', '==', 'OPEN'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HelpRequest));
      callback(requests);
    });
  }

  /**
   * Admin: Subscribe to all OPEN judge issues
   */
  static subscribeToOpenJudgeIssues(callback: (issues: JudgeIssue[]) => void): () => void {
    const q = query(
      collection(db, 'judgeIssues'),
      where('status', '==', 'OPEN'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JudgeIssue));
      callback(issues);
    });
  }
}
