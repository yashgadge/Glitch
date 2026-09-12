import { collection, addDoc, getDoc, getDocs, doc, updateDoc, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { guardValue } from './firestoreGuard';

export type CertificateType = 'Winner' | 'RunnerUp' | 'Participant' | 'Volunteer' | 'Judge' | 'Mentor' | 'Organizer' | 'SpecialAward';
export type CertificateStatus = 'Valid' | 'Revoked' | 'Reissued';

export interface CertificateMetadata {
  certificateId: string;
  ownerId: string;
  ownerName: string;
  type: CertificateType;
  issuedDate: string;
  status: CertificateStatus;
  issuedBy: string; // Organizer ID
}

export class CertificateService {
  /**
   * Generates a new certificate record in Firestore.
   * Note: The actual PDF generation happens client-side or via a Cloud Function, 
   * this manages the verifiable metadata.
   */
  static async issueCertificate(data: Omit<CertificateMetadata, 'certificateId' | 'issuedDate' | 'status'>): Promise<string> {
    try {
      // 1. Prevent duplicate certificates of the same type for the same user
      const validOwnerId = guardValue(data.ownerId, 'ownerId');
      const validType = guardValue(data.type, 'type');
      const existingQuery = query(
        collection(db, 'certificates'), 
        where('ownerId', '==', validOwnerId),
        where('type', '==', validType),
        where('status', '==', 'Valid')
      );
      const existingSnapshot = await getDocs(existingQuery);
      if (!existingSnapshot.empty) {
        throw new Error(`Participant already has a Valid ${data.type} certificate.`);
      }

      // 2. Validate participant eligibility (must exist and be active)
      // Note: In a real system you'd handle different entity types (volunteer vs participant) 
      // but for participants we check the 'participants' collection. 
      // Since manual issuance might target volunteers, we can just check if any user exists in auth or collection, 
      // but let's stick to participant collection for basic validation, or fallback if it's a participant type.
      if (['Winner', 'RunnerUp', 'Participant'].includes(data.type)) {
        const participantDoc = await getDoc(doc(db, 'participants', data.ownerId));
        if (!participantDoc.exists()) {
          throw new Error(`Eligible participant not found for ID: ${data.ownerId}`);
        }
      }

      const docRef = await addDoc(collection(db, 'certificates'), {
        ...data,
        issuedDate: new Date().toISOString(),
        status: 'Valid'
      });

      // After generating the Firestore ID, update the document to include it as the certificateId for easy querying
      await updateDoc(docRef, { certificateId: docRef.id });

      // Audit Log
      await addDoc(collection(db, 'auditLogs'), {
        action: 'CERTIFICATE_ISSUED',
        targetId: docRef.id,
        ownerId: data.ownerId,
        type: data.type,
        timestamp: new Date().toISOString()
      });

      return docRef.id;
    } catch (err) {
      console.error('Failed to issue certificate:', err);
      throw err;
    }
  }

  /**
   * Verifies a certificate by ID, returning its metadata.
   */
  static async verifyCertificate(certificateId: string): Promise<CertificateMetadata | null> {
    try {
      const certDoc = await getDoc(doc(db, 'certificates', certificateId));
      if (!certDoc.exists()) return null;
      return certDoc.data() as CertificateMetadata;
    } catch (err) {
      console.error('Failed to verify certificate:', err);
      return null;
    }
  }

  /**
   * Revokes a certificate.
   */
  static async revokeCertificate(certificateId: string, adminId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'certificates', certificateId), { status: 'Revoked' });
      
      // Audit Log
      await addDoc(collection(db, 'auditLogs'), {
        action: 'CERTIFICATE_REVOKED',
        targetId: certificateId,
        adminId,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to revoke certificate:', err);
      throw err;
    }
  }

  /**
   * Subscribe to all certificates.
   */
  static subscribeToAllCertificates(callback: (certificates: CertificateMetadata[]) => void): () => void {
    const q = query(collection(db, 'certificates'), orderBy('issuedDate', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const results: CertificateMetadata[] = [];
      snapshot.forEach((docSnap) => {
        results.push({ ...docSnap.data(), certificateId: docSnap.id } as CertificateMetadata);
      });
      callback(results);
    });
  }

  /**
   * Subscribe to a user's certificates.
   */
  static subscribeToCertificates(ownerId: string, callback: (certs: CertificateMetadata[]) => void): () => void {
    const validOwnerId = guardValue(ownerId, 'ownerId');
    const q = query(collection(db, 'certificates'), where('ownerId', '==', validOwnerId));
    return onSnapshot(q, (snapshot) => {
      const certs = snapshot.docs.map(doc => doc.data() as CertificateMetadata);
      callback(certs);
    }, (error) => {
      console.error(`Error subscribing to certificates for ${ownerId}:`, error);
      callback([]);
    });
  }
}

