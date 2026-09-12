import * as functions from "firebase-functions/v1";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

/**
 * Validates a QR code and checks in a participant atomically.
 * Prevents duplicate check-ins and unauthorized access.
 */
export const checkInParticipant = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const { participantId, teamId, passToken, gateId } = data;

  if (!participantId || !teamId || !passToken) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required QR payload fields.");
  }

  const db = getFirestore();
  const actorUid = context.auth.uid;

  // Verify actor has permission (must be volunteer, coordinator, organizer, or super_admin)
  const actorDoc = await db.collection("staff").doc(actorUid).get();
  if (!actorDoc.exists) {
    throw new functions.https.HttpsError("permission-denied", "Actor staff record not found.");
  }
  const actorData = actorDoc.data()!;
  const roles = actorData.roles || (actorData.role ? [actorData.role] : []);
  if (!roles.some((r: string) => ["volunteer", "class_coordinator", "organizer", "super_admin"].includes(r))) {
    throw new functions.https.HttpsError("permission-denied", "Insufficient permissions to check in participants.");
  }

  return await db.runTransaction(async (transaction) => {
    // 1. Fetch Participant
    const participantRef = db.collection("participants").doc(participantId);
    const participantDoc = await transaction.get(participantRef);
    if (!participantDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Participant not found.");
    }
    const participantData = participantDoc.data()!;

    // 2. Fetch Team and Verify Participant Membership
    if (!participantData.teamId) {
      throw new functions.https.HttpsError("failed-precondition", "NO TEAM ASSIGNED");
    }
    if (participantData.teamId !== teamId) {
      throw new functions.https.HttpsError("permission-denied", "TEAM MISMATCH");
    }

    const teamRef = db.collection("teams").doc(teamId);
    const teamDoc = await transaction.get(teamRef);
    if (!teamDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Team not found.");
    }
    const teamData = teamDoc.data()!;
    if (teamData.eliminated || teamData.disqualified) {
      throw new functions.https.HttpsError("failed-precondition", "Team is eliminated or disqualified.");
    }
    
    const membersArray = teamData.memberIds || teamData.members || [];
    if (!membersArray.includes(participantId)) {
      throw new functions.https.HttpsError("permission-denied", "INVALID_TEAM_MEMBERSHIP");
    }
    
    if (teamData.paymentStatus !== 'PAID' && teamData.paymentStatus !== 'paid') {
      throw new functions.https.HttpsError("permission-denied", "REGISTRATION_PAYMENT_REQUIRED");
    }

    // 3. Fetch Digital Pass
    const passRef = db.collection("digitalPasses").doc(participantId);
    const passDoc = await transaction.get(passRef);
    if (!passDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Digital pass not found.");
    }
    const passData = passDoc.data()!;

    // 4. Validate Token & Status
    if (passData.token !== passToken) {
      throw new functions.https.HttpsError("permission-denied", "Invalid or expired QR token.");
    }
    if (passData.status !== "active") {
      throw new functions.https.HttpsError("permission-denied", `Pass is ${passData.status}.`);
    }
    if (passData.isRevoked) {
      throw new functions.https.HttpsError("permission-denied", "Pass is revoked.");
    }

    // 5. Check if already checked in
    if (participantData.checkedIn) {
      throw new functions.https.HttpsError("already-exists", "Participant is already checked in.");
    }

    // 6. Write Attendance Record
    const attendanceRef = db.collection("attendanceLogs").doc();
    transaction.set(attendanceRef, {
      participantId,
      teamId,
      actorId: actorUid,
      gateId: gateId || "Main Gate",
      timestamp: new Date().toISOString()
    });

    // 7. Update Participant state
    transaction.update(participantRef, {
      checkedIn: true,
      checkedInAt: new Date().toISOString(),
      checkedInBy: actorUid
    });

    // 8. Log Audit
    const auditRef = db.collection("auditLogs").doc();
    transaction.set(auditRef, {
      action: "ATTENDANCE_CHECK_IN",
      actorId: actorUid,
      targetId: participantId,
      entityType: "participant",
      details: `Checked in at ${gateId || "Main Gate"}`,
      timestamp: new Date().toISOString()
    });

    return { success: true, message: "Participant checked in successfully." };
  });
});

export const undoAttendance = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const { participantId } = data;
  const db = getFirestore();
  const actorUid = context.auth.uid;

  // Verify actor permission
  const actorDoc = await db.collection("staff").doc(actorUid).get();
  if (!actorDoc.exists) {
    throw new functions.https.HttpsError("permission-denied", "Actor staff record not found.");
  }
  const actorData = actorDoc.data()!;
  const roles = actorData.roles || (actorData.role ? [actorData.role] : []);
  if (!roles.some((r: string) => ["organizer", "super_admin"].includes(r))) {
    throw new functions.https.HttpsError("permission-denied", "Only organizers can undo attendance.");
  }

  return await db.runTransaction(async (transaction) => {
    const participantRef = db.collection("participants").doc(participantId);
    const participantDoc = await transaction.get(participantRef);
    if (!participantDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Participant not found.");
    }
    const participantData = participantDoc.data()!;
    if (!participantData.checkedIn) {
      throw new functions.https.HttpsError("failed-precondition", "Participant is not checked in.");
    }

    transaction.update(participantRef, {
      checkedIn: false,
      checkedInAt: FieldValue.delete(),
      checkedInBy: FieldValue.delete()
    });

    const auditRef = db.collection("auditLogs").doc();
    transaction.set(auditRef, {
      action: "ATTENDANCE_UNDO",
      actorId: actorUid,
      targetId: participantId,
      entityType: "participant",
      details: `Attendance manually undone`,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  });
});
