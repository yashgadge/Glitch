import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

admin.initializeApp();

// Export attendance functions
export * from "./attendance";
export * from "./redemptions";
export * from "./submissions";
export * from "./evaluations";
export * from "./teams";
export * from "./classrooms";
export * from "./assignments";

// Helper for generating secure crypto tokens
const generateSecureToken = () => {
  const crypto = require('crypto');
  return `GL36-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
};

// Helper for sanitizing objects before Firestore write
function cleanObject(obj: any) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null && v !== "")
  );
}

export const createStaff = functions.https.onCall(async (data, context) => {
  // 1. Verify Caller is Authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  // 2. Verify Caller Role (Must be super_admin)
  const callerUser = await getAuth().getUser(context.auth.uid);
  const callerEmail = callerUser.email;
  
  const callerDoc = await getFirestore().collection("staff").doc(context.auth.uid).get();
  const callerData = callerDoc.data();
  const callerRoles = callerData ? (callerData.roles || (callerData.role ? [callerData.role] : [])) : [];
  if (!callerRoles.includes("super_admin")) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only super_admin users can provision staff accounts."
    );
  }

  const { name, email, phone, roles, password } = data;

  if (!name || !email || !roles || roles.length === 0 || !password) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Name, email, password, and at least one role are required."
    );
  }

  const safeEmail = email.trim().toLowerCase();

  try {
    // 3. Check for Duplicate Emails in Auth
    try {
      await getAuth().getUserByEmail(safeEmail);
      throw new functions.https.HttpsError(
        "already-exists",
        "A staff account with this email already exists."
      );
    } catch (error: any) {
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
    }

    // 4. Create Firebase Auth Account
    const userRecord = await getAuth().createUser({
      email: safeEmail,
      password: password,
      displayName: name.trim(),
    });

    const uid = userRecord.uid;

    // 5. Run Firestore Transaction
    try {
      const db = getFirestore();
      const staffId = await db.runTransaction(async (transaction) => {
        // Get counter
        const counterRef = db.collection("counters").doc("staff");
        const counterDoc = await transaction.get(counterRef);
        
        let newCount = 1;
        if (!counterDoc.exists) {
          transaction.set(counterRef, { staffCount: 1 });
        } else {
          newCount = (counterDoc.data()?.staffCount || 0) + 1;
          transaction.update(counterRef, { staffCount: newCount });
        }

        const generatedStaffId = `GL36-S-${newCount.toString().padStart(4, "0")}`;

        // Build the safe staff document (stripping undefined, null, empty string)
        const staffPayload = cleanObject({
          name: name.trim(),
          email: safeEmail,
          phone: phone ? phone.trim() : null,
          roles,
          role: roles[0], // legacy fallback
          status: "Active",
          mustChangePassword: false,
          customPermissions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          staffId: generatedStaffId,
        });

        const staffRef = db.collection("staff").doc(uid);
        transaction.set(staffRef, staffPayload);

        // Audit Log
        const auditRef = db.collection("auditLogs").doc();
        transaction.set(auditRef, {
          action: "PROVISION_STAFF",
          actorId: context.auth!.uid,
          actorRole: "super_admin",
          actorEmail: callerEmail,
          targetId: uid,
          resourceType: "staff",
          timestamp: new Date().toISOString(),
          details: `Provisioned new staff account for ${safeEmail} with roles: ${roles.join(", ")}`,
        });

        return generatedStaffId;
      });

      // 6. Return success
      return { success: true, uid, staffId };
    } catch (dbError: any) {
      // Rollback: Delete orphan Auth user
      await getAuth().deleteUser(uid).catch(e => console.error("Rollback failed:", e));
      throw dbError;
    }
  } catch (error: any) {
    console.error("Error creating staff:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message || "An unknown error occurred.");
  }
});

export const createParticipant = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }

  // Check admin
  const callerDoc = await getFirestore().collection("staff").doc(context.auth.uid).get();
  if (!callerDoc.exists || !['super_admin', 'admin', 'organizer'].includes(callerDoc.data()?.roles?.[0] || callerDoc.data()?.role)) {
    throw new functions.https.HttpsError("permission-denied", "Only admins can create participants.");
  }

  const { name, email, phone, college, track, teamId } = data;

  if (!name || !email) {
    throw new functions.https.HttpsError("invalid-argument", "Name and email are required");
  }

  const safeEmail = email.trim().toLowerCase();
  
  try {
    let uid = "";
    let isNewUser = false;
    
    // Check Auth
    try {
      const existingUser = await getAuth().getUserByEmail(safeEmail);
      uid = existingUser.uid;
    } catch (e: any) {
      if (e.code === "auth/user-not-found") {
        const newUser = await getAuth().createUser({
          email: safeEmail,
          password: `GL36-${Math.random().toString(36).substring(2, 8)}`,
          displayName: name.trim()
        });
        uid = newUser.uid;
        isNewUser = true;
      } else {
        throw e;
      }
    }

    try {
      const db = getFirestore();
      
      const qrToken = generateSecureToken();
      const passToken = generateSecureToken();
      
      const participantId = await db.runTransaction(async (transaction) => {
        // Counter for Participant ID
        const counterRef = db.collection("counters").doc("participants");
        const counterDoc = await transaction.get(counterRef);
        let newCount = 1;
        if (!counterDoc.exists) {
          transaction.set(counterRef, { count: 1 });
        } else {
          newCount = (counterDoc.data()?.count || 0) + 1;
          transaction.update(counterRef, { count: newCount });
        }
        
        const pId = `P-${newCount.toString().padStart(4, "0")}`;

        const participantRef = db.collection("participants").doc(uid);
        const participantPayload = cleanObject({
          participantId: pId,
          name: name.trim(),
          email: safeEmail,
          phone: phone ? phone.trim() : null,
          college: college || null,
          track: track || null,
          teamId: teamId || null,
          qrToken,
          status: "approved",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        
        transaction.set(participantRef, participantPayload, { merge: true });

        // Log
        const auditRef = db.collection("auditLogs").doc();
        transaction.set(auditRef, {
          action: "PARTICIPANT_CREATED",
          targetId: uid,
          actorId: context.auth!.uid,
          details: `Imported participant and generated digital pass`,
          timestamp: new Date().toISOString()
        });
        
        return pId;
      });

      return { success: true, uid, participantId, qrToken, passToken };
    } catch (dbError: any) {
      if (isNewUser) {
        await getAuth().deleteUser(uid).catch(e => console.error("Rollback failed:", e));
      }
      throw dbError;
    }
  } catch (error: any) {
    console.error("Error creating participant:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

export const adminDeleteParticipant = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Authentication required");

  // Verify Admin
  const callerDoc = await getFirestore().collection("staff").doc(context.auth.uid).get();
  if (!callerDoc.exists || !['super_admin'].includes(callerDoc.data()?.roles?.[0] || callerDoc.data()?.role)) {
    throw new functions.https.HttpsError("permission-denied", "Only super_admins can delete participants.");
  }

  const { participantId } = data;
  if (!participantId) throw new functions.https.HttpsError("invalid-argument", "Participant ID is required.");

  try {
    const db = getFirestore();
    const participantRef = db.collection("participants").doc(participantId);
    
    await db.runTransaction(async (transaction) => {
      const pDoc = await transaction.get(participantRef);
      if (!pDoc.exists) throw new functions.https.HttpsError("not-found", "Participant not found.");
      
      const pData = pDoc.data()!;
      
      // Remove from team if they are in one
      if (pData.teamId) {
        const teamRef = db.collection("teams").doc(pData.teamId);
        const teamDoc = await transaction.get(teamRef);
        if (teamDoc.exists) {
          const tData = teamDoc.data()!;
          const newMemberIds = (tData.memberIds || tData.members || []).filter((id: string) => id !== participantId);
          const newPendingIds = (tData.pendingMemberIds || []).filter((id: string) => id !== participantId);
          
          if (newMemberIds.length === 0) {
            // No members left, delete the team
            transaction.delete(teamRef);
          } else {
            const updates: any = {
              memberIds: newMemberIds,
              members: newMemberIds,
              pendingMemberIds: newPendingIds,
              updatedAt: new Date().toISOString()
            };
            
            // Reassign leadership if the deleted participant was the leader
            if (tData.leaderId === participantId) {
              updates.leaderId = newMemberIds[0];
            }
            
            transaction.update(teamRef, updates);
          }
        }
      }

      // Delete the participant doc
      transaction.delete(participantRef);

      // Audit Log
      const auditRef = db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        action: "PARTICIPANT_DELETED",
        targetId: participantId,
        actorId: context.auth!.uid,
        timestamp: new Date().toISOString(),
        details: `Deleted participant and cascading associated records.`
      });
    });

    // Batched deletions for associated collections (outside transaction due to query limits)
    const collectionsToDelete = ['digitalPasses', 'orders', 'attendance', 'certificates'];
    for (const coll of collectionsToDelete) {
      const snapshot = await db.collection(coll).where('participantId', '==', participantId).get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      if (!snapshot.empty) await batch.commit();
    }

    // Check if the user is also a staff member before deleting from Auth
    try {
      const staffDoc = await db.collection("staff").doc(participantId).get();
      if (!staffDoc.exists) {
        await getAuth().deleteUser(participantId);
      } else {
        console.log(`Skipped Auth deletion for ${participantId} because they are a staff member.`);
      }
    } catch (e: any) {
      if (e.code !== "auth/user-not-found") {
        console.error("Failed to delete Auth user:", e);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting participant:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", error.message);
  }
});

export const adminDeleteTeam = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Authentication required");

  // Verify Admin
  const callerDoc = await getFirestore().collection("staff").doc(context.auth.uid).get();
  if (!callerDoc.exists || !['super_admin'].includes(callerDoc.data()?.roles?.[0] || callerDoc.data()?.role)) {
    throw new functions.https.HttpsError("permission-denied", "Only super_admins can delete teams.");
  }

  const { teamId } = data;
  if (!teamId) throw new functions.https.HttpsError("invalid-argument", "Team ID is required.");

  try {
    const db = getFirestore();
    const teamRef = db.collection("teams").doc(teamId);
    
    await db.runTransaction(async (transaction) => {
      const tDoc = await transaction.get(teamRef);
      if (!tDoc.exists) throw new functions.https.HttpsError("not-found", "Team not found.");
      
      const tData = tDoc.data()!;
      const allMembers = [...(tData.memberIds || tData.members || []), ...(tData.pendingMemberIds || [])];
      
      // Unlink all members
      for (const memberId of allMembers) {
        const pRef = db.collection("participants").doc(memberId);
        transaction.update(pRef, { teamId: null });
      }

      // Delete the team doc
      transaction.delete(teamRef);

      // Audit Log
      const auditRef = db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        action: "TEAM_DELETED",
        targetId: teamId,
        actorId: context.auth!.uid,
        timestamp: new Date().toISOString(),
        details: `Deleted team and unlinked members.`
      });
    });

    // Delete associated submissions and change requests
    const collectionsToDelete = [
      { name: 'submissions', field: 'teamId' },
      { name: 'changeRequests', field: 'teamId' }
    ];
    
    for (const coll of collectionsToDelete) {
      const snapshot = await db.collection(coll.name).where(coll.field, '==', teamId).get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      if (!snapshot.empty) await batch.commit();
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting team:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// Digital Pass Operations

export const generateDigitalPass = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Authentication required");

  // Verify Admin
  const callerDoc = await getFirestore().collection("staff").doc(context.auth.uid).get();
  if (!callerDoc.exists || !['super_admin', 'admin', 'organizer'].includes(callerDoc.data()?.roles?.[0] || callerDoc.data()?.role)) {
    throw new functions.https.HttpsError("permission-denied", "Only admins can generate passes.");
  }

  const { participantId } = data;
  if (!participantId) throw new functions.https.HttpsError("invalid-argument", "Participant ID is required.");

  try {
    const db = getFirestore();
    
    // Check Team Payment Status before generating pass
    const participantDoc = await db.collection("participants").doc(participantId).get();
    if (!participantDoc.exists) throw new functions.https.HttpsError("not-found", "Participant not found.");
    
    const teamId = participantDoc.data()?.teamId;
    if (!teamId) throw new functions.https.HttpsError("failed-precondition", "TEAM_MEMBERSHIP_REQUIRED");
    
    const teamDoc = await db.collection("teams").doc(teamId).get();
    if (!teamDoc.exists) throw new functions.https.HttpsError("not-found", "TEAM_NOT_FOUND");
    
    const teamData = teamDoc.data();
    const membersArray = teamData?.memberIds || teamData?.members || [];
    if (!membersArray.includes(participantId)) {
      throw new functions.https.HttpsError("permission-denied", "INVALID_TEAM_MEMBERSHIP");
    }
    
    if (teamData?.paymentStatus !== 'PAID' && teamData?.paymentStatus !== 'paid') {
      throw new functions.https.HttpsError("permission-denied", "REGISTRATION_PAYMENT_REQUIRED");
    }
    
    // Check if active pass exists
    const passesSnapshot = await db.collection("digitalPasses")
      .where("participantId", "==", participantId)
      .where("status", "==", "active")
      .get();
      
    if (!passesSnapshot.empty) {
      throw new functions.https.HttpsError("already-exists", "An active pass already exists for this participant.");
    }

    const token = generateSecureToken();
    const passRef = db.collection("digitalPasses").doc();
    
    await db.runTransaction(async (transaction) => {
      transaction.set(passRef, {
        participantId,
        token,
        status: 'active',
        createdAt: new Date().toISOString(),
        activatedAt: new Date().toISOString(),
        reissueCount: 0,
        isRevoked: false,
        version: 1
      });

      const auditRef = db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        action: "PASS_GENERATED",
        targetId: participantId,
        actorId: context.auth!.uid,
        timestamp: new Date().toISOString(),
        details: `Generated new digital pass`
      });
    });

    return { success: true, passId: passRef.id };
  } catch (error: any) {
    console.error("Error generating pass:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", error.message);
  }
});

export const reissueDigitalPass = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Authentication required");

  // Verify Admin
  const callerDoc = await getFirestore().collection("staff").doc(context.auth.uid).get();
  if (!callerDoc.exists || !['super_admin', 'admin', 'organizer'].includes(callerDoc.data()?.roles?.[0] || callerDoc.data()?.role)) {
    throw new functions.https.HttpsError("permission-denied", "Only admins can reissue passes.");
  }

  const { passId } = data;
  if (!passId) throw new functions.https.HttpsError("invalid-argument", "Pass ID is required.");

  try {
    const db = getFirestore();
    const passRef = db.collection("digitalPasses").doc(passId);
    const newPassRef = db.collection("digitalPasses").doc();
    const newToken = generateSecureToken();
    
    await db.runTransaction(async (transaction) => {
      const passSnap = await transaction.get(passRef);
      if (!passSnap.exists) throw new functions.https.HttpsError("not-found", "Pass not found.");
      
      const passData = passSnap.data()!;
      
      // Check Team Payment Status before reissuing pass
      const participantDoc = await transaction.get(db.collection("participants").doc(passData.participantId));
      if (!participantDoc.exists) throw new functions.https.HttpsError("not-found", "Participant not found.");
      
      const teamId = participantDoc.data()?.teamId;
      if (!teamId) throw new functions.https.HttpsError("failed-precondition", "TEAM_MEMBERSHIP_REQUIRED");
      
      const teamDoc = await transaction.get(db.collection("teams").doc(teamId));
      if (!teamDoc.exists) throw new functions.https.HttpsError("not-found", "TEAM_NOT_FOUND");
      
      const teamData = teamDoc.data();
      const membersArray = teamData?.memberIds || teamData?.members || [];
      if (!membersArray.includes(passData.participantId)) {
        throw new functions.https.HttpsError("permission-denied", "INVALID_TEAM_MEMBERSHIP");
      }
      
      if (teamData?.paymentStatus !== 'PAID' && teamData?.paymentStatus !== 'paid') {
        throw new functions.https.HttpsError("permission-denied", "REGISTRATION_PAYMENT_REQUIRED");
      }
      
      transaction.update(passRef, { status: 'reissued', isRevoked: true });
      
      transaction.set(newPassRef, {
        participantId: passData.participantId,
        token: newToken,
        status: 'active',
        createdAt: new Date().toISOString(),
        activatedAt: new Date().toISOString(),
        reissueCount: (passData.reissueCount || 0) + 1,
        isRevoked: false,
        version: (passData.version || 1) + 1
      });

      const auditRef = db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        action: "PASS_REISSUED",
        targetId: passData.participantId,
        actorId: context.auth!.uid,
        oldPassId: passId,
        newPassId: newPassRef.id,
        timestamp: new Date().toISOString(),
        details: `Reissued pass to version ${(passData.version || 1) + 1}`
      });
    });

    return { success: true, newPassId: newPassRef.id };
  } catch (error: any) {
    console.error("Error reissuing pass:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", error.message);
  }
});

export const revokeDigitalPass = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Authentication required");

  // Verify Admin
  const callerDoc = await getFirestore().collection("staff").doc(context.auth.uid).get();
  if (!callerDoc.exists || !['super_admin', 'admin', 'organizer'].includes(callerDoc.data()?.roles?.[0] || callerDoc.data()?.role)) {
    throw new functions.https.HttpsError("permission-denied", "Only admins can revoke passes.");
  }

  const { passId } = data;
  if (!passId) throw new functions.https.HttpsError("invalid-argument", "Pass ID is required.");

  try {
    const db = getFirestore();
    const passRef = db.collection("digitalPasses").doc(passId);
    
    await db.runTransaction(async (transaction) => {
      const passSnap = await transaction.get(passRef);
      if (!passSnap.exists) throw new functions.https.HttpsError("not-found", "Pass not found.");
      
      const passData = passSnap.data()!;
      
      transaction.update(passRef, { status: 'revoked', isRevoked: true });

      const auditRef = db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        action: "PASS_REVOKED",
        targetId: passData.participantId,
        actorId: context.auth!.uid,
        passId: passId,
        timestamp: new Date().toISOString(),
        details: `Revoked digital pass`
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error revoking pass:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// Certificate Generation
export const generateCertificate = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Authentication required");

  // Verify Admin
  const callerDoc = await getFirestore().collection("staff").doc(context.auth.uid).get();
  if (!callerDoc.exists || !['super_admin', 'admin', 'organizer'].includes(callerDoc.data()?.roles?.[0] || callerDoc.data()?.role)) {
    throw new functions.https.HttpsError("permission-denied", "Only admins can generate certificates.");
  }

  const { participantId, type, teamName, track, name } = data;
  if (!participantId || !type) throw new functions.https.HttpsError("invalid-argument", "Participant ID and Type are required.");

  try {
    const db = getFirestore();
    
    // Check for duplicate certificates of the same type
    const certsSnapshot = await db.collection("certificates")
      .where("participantId", "==", participantId)
      .where("type", "==", type)
      .get();
      
    if (!certsSnapshot.empty) {
      throw new functions.https.HttpsError("already-exists", `A ${type} certificate already exists for this participant.`);
    }

    const certRef = db.collection("certificates").doc();
    const certId = `CERT-${require('crypto').randomBytes(4).toString('hex').toUpperCase()}`;
    
    await db.runTransaction(async (transaction) => {
      transaction.set(certRef, {
        certificateId: certId,
        participantId,
        name: name,
        type,
        teamName: teamName || null,
        track: track || null,
        issuedBy: context.auth!.uid,
        issueDate: new Date().toISOString(),
        status: 'active'
      });

      const auditRef = db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        action: "CERTIFICATE_GENERATED",
        targetId: participantId,
        actorId: context.auth!.uid,
        timestamp: new Date().toISOString(),
        details: `Generated ${type} certificate: ${certId}`
      });
    });

    return { success: true, certificateId: certId };
  } catch (error: any) {
    console.error("Error generating certificate:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", error.message);
  }
});
// Manual Confirm Team
export const adminManualConfirmTeam = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Authentication required");

  // Verify Admin
  const callerDoc = await getFirestore().collection("staff").doc(context.auth.uid).get();
  if (!callerDoc.exists || !['super_admin', 'admin', 'organizer'].includes(callerDoc.data()?.roles?.[0] || callerDoc.data()?.role)) {
    throw new functions.https.HttpsError("permission-denied", "Only admins can manually confirm teams.");
  }

  const { teamId } = data;
  if (!teamId) throw new functions.https.HttpsError("invalid-argument", "Team ID is required.");

  try {
    const db = getFirestore();
    const teamRef = db.collection("teams").doc(teamId);
    
    await db.runTransaction(async (transaction) => {
      const teamDoc = await transaction.get(teamRef);
      if (!teamDoc.exists) throw new functions.https.HttpsError("not-found", "Team not found.");
      
      const teamData = teamDoc.data()!;
      if (teamData.paymentStatus === 'PAID') {
        throw new functions.https.HttpsError("failed-precondition", "Team is already confirmed/paid.");
      }

      transaction.update(teamRef, {
        paymentStatus: 'PAID',
        registrationStatus: 'CONFIRMED',
        updatedAt: new Date().toISOString()
      });

      if (teamData.members && Array.isArray(teamData.members)) {
        for (const memberId of teamData.members) {
          const passesQuery = db.collection("digitalPasses")
            .where("participantId", "==", memberId)
            .where("status", "==", "active");
          const passesSnapshot = await transaction.get(passesQuery);
          
          if (passesSnapshot.empty) {
            const token = generateSecureToken();
            const passRef = db.collection("digitalPasses").doc();
            transaction.set(passRef, {
              participantId: memberId,
              token,
              status: 'active',
              createdAt: new Date().toISOString(),
              activatedAt: new Date().toISOString(),
              reissueCount: 0,
              isRevoked: false,
              version: 1
            });
          }
        }
      }

      const auditRef = db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        action: "TEAM_MANUAL_CONFIRM",
        targetId: teamId,
        actorId: context.auth!.uid,
        timestamp: new Date().toISOString(),
        details: `Manually confirmed team registration without payment`
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error manually confirming team:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// Razorpay Integration

export const createRazorpayOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Authentication required");

  const { items, receipt, notes } = data; // items is [{ id: 'food-day1', quantity: 2, allocations: [] }]
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Items array is required.");
  }

  const hasRegistration = items.some((i: any) => i.id === 'registration-fee');
  const hasAddons = items.some((i: any) => i.id !== 'registration-fee');
  if (hasRegistration && hasAddons) {
    throw new functions.https.HttpsError("invalid-argument", "Cannot mix registration fee with add-on products in a single order.");
  }

  const db = getFirestore();
  let isTeamLeader = false;
  let teamMembers: string[] = [];
  
  if (notes && notes.teamId) {
    const teamDoc = await db.collection("teams").doc(notes.teamId).get();
    if (!teamDoc.exists) throw new functions.https.HttpsError("not-found", "Team not found.");
    
    if (teamDoc.data()?.leaderId === context.auth.uid) {
        isTeamLeader = true;
    }
    teamMembers = teamDoc.data()?.memberIds || teamDoc.data()?.members || [];
  }

  // Calculate amount securely on the server
  let calculatedAmount = 0;
  const validatedItems = [];
  
  for (const item of items) {
    let productData: any;
    let isRegistration = (item.id === 'registration-fee');
    
    if (isRegistration) {
      const configDoc = await db.collection("system").doc("eventConfig").get();
      const feeAmount = configDoc.data()?.registrationFeeAmount || 1500;
      productData = {
        id: 'registration-fee',
        name: 'Team Registration Fee',
        type: 'registration',
        price: feeAmount,
        isActive: true,
        purchaseEnabled: true,
      };

      if (notes && notes.teamId) {
        const teamDoc = await db.collection("teams").doc(notes.teamId).get();
        if (teamDoc.data()?.paymentStatus?.toUpperCase() === 'PAID') {
          throw new functions.https.HttpsError("failed-precondition", "Team registration is already paid.");
        }
      }
    } else {
      const productDoc = await db.collection("eventProducts").doc(item.id).get();
      if (!productDoc.exists) {
         throw new functions.https.HttpsError("not-found", `Product ${item.id} not found in catalog.`);
      }
      
      productData = productDoc.data();
      productData.id = productDoc.id;
    }

    if (!productData) {
      throw new functions.https.HttpsError("not-found", `Item ${item.id} not found in catalog.`);
    }
    
    if (productData.isActive === false || productData.purchaseEnabled === false) {
      throw new functions.https.HttpsError("failed-precondition", `Item ${item.id} is not available for purchase.`);
    }
    
    if (!isRegistration) {
      if (!isTeamLeader) {
         throw new functions.https.HttpsError("permission-denied", "Only the Team Leader can purchase add-ons.");
      }
      
      const teamDoc = await db.collection("teams").doc(notes.teamId).get();
      const teamData = teamDoc.data();
      const isTeamPaidOrLocked = teamData?.paymentStatus?.toLowerCase() === 'paid' || teamData?.status === 'locked';
      if (!isTeamPaidOrLocked) {
         throw new functions.https.HttpsError("failed-precondition", "Team registration must be PAID before purchasing add-ons.");
      }

      if (productData.inventory !== undefined && productData.inventory < (item.quantity || 1)) {
         throw new functions.https.HttpsError("failed-precondition", `Insufficient inventory for ${productData.name}.`);
      }
      
      if (item.allocations && Array.isArray(item.allocations)) {
          for (const alloc of item.allocations) {
             if (!teamMembers.includes(alloc.participantId)) {
                throw new functions.https.HttpsError("permission-denied", "Recipient must be an active member of your team.");
             }
          }
      }
    }
    
    calculatedAmount += productData.price * (item.quantity || 1);
    
    validatedItems.push({
      id: productData.id,
      name: productData.name,
      type: productData.type || 'unknown',
      quantity: item.quantity || 1,
      unitPrice: productData.price,
      totalPrice: productData.price * (item.quantity || 1),
      allocations: item.allocations || []
    });
  }

  const orderId = receipt || `ORD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  try {
    const razorpay = new (require("razorpay"))({
      key_id: process.env.RAZORPAY_KEY_ID || (functions.config as any)().razorpay?.key_id || "mock_key_id",
      key_secret: process.env.RAZORPAY_KEY_SECRET || (functions.config as any)().razorpay?.key_secret || "mock_key_secret",
    });

    const options = {
      amount: Math.round(calculatedAmount * 100),
      currency: "INR",
      receipt: orderId,
      notes: notes || {}
    };

    if (razorpay.key_id === "mock_key_id") {
      const now = new Date().toISOString();
      await db.collection('orders').doc(orderId).set({
        id: orderId,
        participantId: context.auth.uid,
        items: validatedItems,
        subtotal: calculatedAmount,
        tax: 0,
        totalAmount: calculatedAmount,
        currency: 'INR',
        status: 'pending_payment',
        notes: notes || {},
        createdAt: now,
        updatedAt: now,
      });

      return {
        id: `order_mock_${Math.random().toString(36).substring(2, 9)}`,
        amount: options.amount,
        currency: options.currency,
        receipt: options.receipt,
        firestoreOrderId: orderId
      };
    }

    const order = await razorpay.orders.create(options);
    
    const now = new Date().toISOString();
    await db.collection('orders').doc(orderId).set({
      id: orderId,
      participantId: context.auth.uid,
      items: validatedItems,
      subtotal: calculatedAmount,
      tax: 0,
      totalAmount: calculatedAmount,
      currency: 'INR',
      status: 'pending_payment',
      notes: notes || {},
      createdAt: now,
      updatedAt: now,
    });
    
    return { ...order, firestoreOrderId: orderId };
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    throw new functions.https.HttpsError("internal", error.message || "Failed to create Razorpay order.");
  }
});

export const verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Authentication required");

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = data;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing payment verification details.");
  }

  const key_secret = process.env.RAZORPAY_KEY_SECRET || (functions.config as any)().razorpay?.key_secret || "mock_key_secret";
  
  if (key_secret !== "mock_key_secret") {
    const crypto = require("crypto");
    const generated_signature = crypto
      .createHmac("sha256", key_secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      throw new functions.https.HttpsError("permission-denied", "Payment signature verification failed.");
    }
  }

  try {
    const db = getFirestore();
    const orderRef = db.collection("orders").doc(orderId);
    
    await db.runTransaction(async (transaction) => {
      // --- ALL READS ---
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) throw new functions.https.HttpsError("not-found", "Order not found.");
      
      const orderData = orderDoc.data();
      if (orderData?.status === "paid") {
        throw new functions.https.HttpsError("failed-precondition", "Order is already paid and processed.");
      }

      let isRegistrationPayment = false;
      const productDocs = new Map();
      
      if (orderData?.items && Array.isArray(orderData.items)) {
        for (const item of orderData.items) {
          if (item.id === 'registration-fee' || item.type === 'registration') {
            isRegistrationPayment = true;
          } else {
            const productRef = db.collection("eventProducts").doc(item.id);
            const productDoc = await transaction.get(productRef);
            productDocs.set(item.id, {
              ref: productRef,
              data: productDoc.exists ? productDoc.data() : { name: item.name || item.id }
            });
          }
        }
      }

      let teamRef = null;
      let teamDocExists = false;
      let teamData = null;
      const memberPasses = new Map();

      if (isRegistrationPayment && orderData?.notes?.teamId) {
        teamRef = db.collection("teams").doc(orderData.notes.teamId);
        const teamDoc = await transaction.get(teamRef);
        teamDocExists = teamDoc.exists;
        
        if (teamDocExists) {
          teamData = teamDoc.data()!;
          const membersArray = teamData.memberIds || teamData.members || [];
          for (const memberId of membersArray) {
            const passesQuery = db.collection("digitalPasses")
              .where("participantId", "==", memberId)
              .where("status", "==", "active");
            const passesSnapshot = await transaction.get(passesQuery);
            memberPasses.set(memberId, passesSnapshot.empty);
          }
        }
      }

      // --- ALL WRITES ---
      transaction.update(orderRef, {
        status: "paid",
        paymentMethod: "razorpay",
        paymentReference: razorpay_payment_id,
        updatedAt: new Date().toISOString()
      });

      if (orderData?.items && Array.isArray(orderData.items)) {
        for (const item of orderData.items) {
          if (item.id !== 'registration-fee' && item.type !== 'registration') {
            const pInfo = productDocs.get(item.id);
            if (!pInfo) continue;
            
            const productRef = pInfo.ref;
            const productData = pInfo.data;

            if (productData?.inventory !== undefined && productData?.inventory !== null) {
               if (productData.inventory < (item.quantity || 1)) {
                  throw new functions.https.HttpsError("failed-precondition", `Insufficient inventory for ${productData.name}.`);
               }
               transaction.update(productRef, {
                  inventory: FieldValue.increment(- (item.quantity || 1)),
                  updatedAt: FieldValue.serverTimestamp()
               });
            }

            if (item.allocations && Array.isArray(item.allocations) && item.allocations.length > 0) {
               for (const alloc of item.allocations) {
                  const entitlementRef = db.collection("entitlements").doc();
                  transaction.set(entitlementRef, {
                    participantId: alloc.participantId,
                    teamId: orderData.notes?.teamId || null,
                    productId: item.id,
                    productNameSnapshot: productData?.name || item.id,
                    quantityPurchased: alloc.quantity,
                    quantityRemaining: alloc.quantity,
                    quantityRedeemed: 0,
                    orderId: orderId,
                    paymentId: razorpay_payment_id,
                    status: "active",
                    entitlementType: productData?.entitlementType || "QUANTITY_BASED",
                    ownership: productData?.ownership || "PARTICIPANT",
                    category: productData?.type || "addon",
                    validFrom: productData?.validFrom || null,
                    validUntil: productData?.validUntil || null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  });
               }
            } else {
               const entitlementRef = db.collection("entitlements").doc();
               transaction.set(entitlementRef, {
                 participantId: orderData.participantId,
                 teamId: orderData.notes?.teamId || null,
                 productId: item.id,
                 productNameSnapshot: productData?.name || item.id,
                 quantityPurchased: item.quantity || 1,
                 quantityRemaining: item.quantity || 1,
                 quantityRedeemed: 0,
                 orderId: orderId,
                 paymentId: razorpay_payment_id,
                 status: "active",
                 entitlementType: productData?.entitlementType || "QUANTITY_BASED",
                 ownership: productData?.ownership || "PARTICIPANT",
                 category: productData?.type || "addon",
                 validFrom: productData?.validFrom || null,
                 validUntil: productData?.validUntil || null,
                 createdAt: new Date().toISOString(),
                 updatedAt: new Date().toISOString()
               });
            }
          }
        }
      }

      if (isRegistrationPayment && teamDocExists && teamRef) {
        transaction.update(teamRef, {
          paymentStatus: 'PAID',
          status: 'locked',
          registrationStatus: 'CONFIRMED',
          updatedAt: new Date().toISOString()
        });
        
        for (const [memberId, emptyPass] of memberPasses.entries()) {
          if (emptyPass) {
            const token = generateSecureToken();
            const passRef = db.collection("digitalPasses").doc();
            transaction.set(passRef, {
              participantId: memberId,
              token,
              status: 'active',
              createdAt: new Date().toISOString(),
              activatedAt: new Date().toISOString(),
              reissueCount: 0,
              isRevoked: false,
              version: 1
            });
          }
        }
      }

      const auditRef = db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        action: "PAYMENT_VERIFIED",
        targetId: orderId,
        actorId: context.auth!.uid,
        timestamp: new Date().toISOString(),
        details: `Verified Razorpay payment ${razorpay_payment_id} and generated entitlements`
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// SendGrid Integration
const sgMail = require("@sendgrid/mail");

// Schedule Notification
export const scheduleNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  
  // Just a stub for now as scheduling requires Cloud Tasks setup
  // In a real app, you would enqueue a task to trigger a push notification later
  return { success: true, message: "Notification scheduled successfully (stub)" };
});

export const emergencyRestoreAdmin = functions.https.onRequest(async (req, res) => {
  try {
    const user = await getAuth().createUser({ email: "yashgadge11155@gmail.com", password: "Yash@123" });
    await getFirestore().collection("staff").doc(user.uid).set({
      email: "yashgadge11155@gmail.com",
      role: "super_admin",
      roles: ["super_admin"],
      name: "Super Admin",
      status: "active",
      createdAt: new Date().toISOString()
    });
    res.send("Successfully restored super admin auth. Password is: Yash@123");
  } catch (e: any) {
    if (e.code === 'auth/email-already-exists') {
      const existingUser = await getAuth().getUserByEmail("yashgadge11155@gmail.com");
      await getAuth().updateUser(existingUser.uid, { password: "Yash@123" });
      await getFirestore().collection("staff").doc(existingUser.uid).set({
        email: "yashgadge11155@gmail.com",
        role: "super_admin",
        roles: ["super_admin"],
        name: "Super Admin",
        status: "active",
        createdAt: new Date().toISOString()
      }, { merge: true });
      res.send("User already existed. Reset password to: Yash@123 and restored staff permissions.");
    } else {
      res.send(e.message);
    }
  }
});

export const sendEmailNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Authentication required");

  // Verify Admin
  const callerDoc = await getFirestore().collection("staff").doc(context.auth.uid).get();
  if (!callerDoc.exists || !['super_admin', 'admin', 'organizer'].includes(callerDoc.data()?.roles?.[0] || callerDoc.data()?.role)) {
    throw new functions.https.HttpsError("permission-denied", "Only admins can send email notifications.");
  }

  const { to, subject, html, text } = data;
  if (!to || !subject || (!html && !text)) {
    throw new functions.https.HttpsError("invalid-argument", "To, subject, and content (html or text) are required.");
  }

  const apiKey = (functions.config as any)().sendgrid?.key || "mock_api_key";
  
  if (apiKey === "mock_api_key" || !(functions.config as any)().sendgrid) {
    console.log("MOCK SENDGRID EMAIL SENT TO:", to, "SUBJECT:", subject);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, mock: true };
  }

  sgMail.setApiKey(apiKey);
  
  const msg = {
    to,
    from: (functions.config as any)().sendgrid?.from_email || "noreply@glitch-36.web.app",
    subject,
    text: text || "GLITCH 36 Notification",
    html: html || `<p>${text}</p>`,
  };

  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error: any) {
    console.error("Error sending email:", error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw new functions.https.HttpsError("internal", error.message || "Failed to send email.");
  }
});

// Participant Team Operations (Client Bypasses)
export const participantCreateTeam = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Authentication required");

  const { name, track } = data;
  if (!name || !track) {
    throw new functions.https.HttpsError("invalid-argument", "Name and track are required.");
  }

  const uid = context.auth.uid;
  const db = getFirestore();

  try {
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    return await db.runTransaction(async (transaction) => {
      const participantRef = db.collection("participants").doc(uid);
      const participantDoc = await transaction.get(participantRef);
      
      if (!participantDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Participant profile not found.");
      }
      
      if (participantDoc.data()?.teamId) {
        throw new functions.https.HttpsError("failed-precondition", "You are already in a team.");
      }

      const teamRef = db.collection("teams").doc();
      const teamId = teamRef.id;

      const teamData = {
        name: name.trim(),
        track,
        leaderId: uid,
        members: [uid],
        inviteCode,
        status: 'registered',
        paymentStatus: 'PAYMENT_PENDING',
        registrationStatus: 'PAYMENT_PENDING',
        currentRound: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      transaction.set(teamRef, teamData);
      transaction.update(participantRef, { teamId });

      return { success: true, teamId, inviteCode };
    });
  } catch (error: any) {
    console.error("Error creating team via function:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", error.message);
  }
});

export const participantJoinTeam = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Authentication required");

  const { inviteCode } = data;
  if (!inviteCode) {
    throw new functions.https.HttpsError("invalid-argument", "Invite code is required.");
  }

  const uid = context.auth.uid;
  const db = getFirestore();

  try {
    const teamsSnapshot = await db.collection("teams")
      .where('inviteCode', '==', inviteCode.toUpperCase())
      .where('status', '!=', 'locked')
      .get();
      
    if (teamsSnapshot.empty) {
      throw new functions.https.HttpsError("not-found", "Invalid or locked invite code.");
    }
    
    const teamId = teamsSnapshot.docs[0].id;

    return await db.runTransaction(async (transaction) => {
      const teamRef = db.collection("teams").doc(teamId);
      const participantRef = db.collection("participants").doc(uid);
      
      const teamDoc = await transaction.get(teamRef);
      const participantDoc = await transaction.get(participantRef);
      
      if (!teamDoc.exists) throw new functions.https.HttpsError("not-found", "Team not found.");
      if (!participantDoc.exists) throw new functions.https.HttpsError("not-found", "Participant profile not found.");
      
      if (participantDoc.data()?.teamId) {
        throw new functions.https.HttpsError("failed-precondition", "You are already in a team.");
      }

      const teamData = teamDoc.data()!;
      if ((teamData.members || []).length >= 4) {
        throw new functions.https.HttpsError("failed-precondition", "Team is full (Max 4 members).");
      }
      
      if ((teamData.members || []).includes(uid)) {
        throw new functions.https.HttpsError("failed-precondition", "You are already in this team.");
      }

      transaction.update(teamRef, { 
        members: [...(teamData.members || []), uid],
        updatedAt: new Date().toISOString()
      });
      
      transaction.update(participantRef, { teamId });

      return { success: true, teamId };
    });
  } catch (error: any) {
    console.error("Error joining team via function:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", error.message);
  }
});
