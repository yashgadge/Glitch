import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

export type AuditAction = 
  | 'INVITATION_CREATED'
  | 'INVITATION_ACCEPTED'
  | 'PASSWORD_CREATED'
  | 'LOGIN'
  | 'LOGOUT'
  | 'ROLE_CHANGED'
  | 'PERMISSION_CHANGED'
  | 'ACCOUNT_DISABLED'
  | 'ACCOUNT_ENABLED'
  | 'STAFF_CREATED';

interface AuditMetadata {
  [key: string]: any;
}

export const logAuditAction = async (action: AuditAction, details: string, metadata: AuditMetadata = {}) => {
  try {
    const user = auth.currentUser;
    await addDoc(collection(db, 'auditLogs'), {
      action,
      details,
      who: user ? user.uid : 'SYSTEM_OR_UNAUTHENTICATED',
      email: user ? user.email : 'UNKNOWN',
      timestamp: new Date().toISOString(),
      metadata
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};
