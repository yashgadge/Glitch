import * as functions from "firebase-functions/v1";
import { getFirestore } from "firebase-admin/firestore";

export const assignJudgesBulk = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const { assignmentsToCreate, assignmentsToRemove, roundId } = data;
  
  const db = getFirestore();
  const actorUid = context.auth.uid;

  // Verify permission
  const actorDoc = await db.collection("staff").doc(actorUid).get();
  if (!actorDoc.exists) {
    throw new functions.https.HttpsError("permission-denied", "Actor staff record not found.");
  }
  const roles = actorDoc.data()!.roles || (actorDoc.data()!.role ? [actorDoc.data()!.role] : []);
  if (!roles.some((r: string) => ["organizer", "super_admin", "admin"].includes(r))) {
    throw new functions.https.HttpsError("permission-denied", "Only organizers/admins can bulk assign.");
  }

  try {
    const batches: FirebaseFirestore.WriteBatch[] = [];
    let currentBatch = db.batch();
    let currentBatchSize = 0;

    const commitCurrentBatch = () => {
      if (currentBatchSize > 0) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        currentBatchSize = 0;
      }
    };

    const addWrite = () => {
      currentBatchSize++;
      if (currentBatchSize >= 450) {
        commitCurrentBatch();
      }
    };

    if (Array.isArray(assignmentsToRemove)) {
      for (const assignmentId of assignmentsToRemove) {
        const ref = db.collection("evaluationAssignments").doc(assignmentId);
        currentBatch.update(ref, {
          status: 'REMOVED',
          removedAt: new Date().toISOString(),
          removedByUid: actorUid
        });
        addWrite();
      }
    }

    if (Array.isArray(assignmentsToCreate)) {
      for (const req of assignmentsToCreate) {
        const id = `${roundId}_${req.judgeId}_${req.teamId}`;
        const ref = db.collection("evaluationAssignments").doc(id);
        currentBatch.set(ref, {
          id,
          roundId,
          judgeId: req.judgeId,
          teamId: req.teamId,
          assignedBy: actorUid,
          assignedAt: new Date().toISOString(),
          status: 'ACTIVE',
          assignmentSource: req.source || 'AUTO'
        });
        addWrite();
      }
    }

    // Add Audit Log
    const auditRef = db.collection("auditLogs").doc();
    currentBatch.set(auditRef, {
      action: "BULK_ASSIGN_JUDGES",
      actorId: actorUid,
      timestamp: new Date().toISOString(),
      details: `Created ${assignmentsToCreate?.length || 0} assignments, Removed ${assignmentsToRemove?.length || 0} assignments for Round ${roundId}`
    });
    addWrite();

    commitCurrentBatch();

    for (const batch of batches) {
      await batch.commit();
    }

    return { 
      success: true, 
      processed: (assignmentsToCreate?.length || 0) + (assignmentsToRemove?.length || 0) 
    };
  } catch (err: any) {
    console.error("Bulk assign error:", err);
    throw new functions.https.HttpsError("internal", err.message || "Bulk assign failed.");
  }
});

export const removeAssignment = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");

  const { roundId, judgeId, teamId } = data;
  const db = getFirestore();
  const actorUid = context.auth.uid;

  const actorDoc = await db.collection("staff").doc(actorUid).get();
  const roles = actorDoc.exists ? (actorDoc.data()!.roles || (actorDoc.data()!.role ? [actorDoc.data()!.role] : [])) : [];
  if (!roles.some((r: string) => ["organizer", "super_admin", "admin"].includes(r))) {
    throw new functions.https.HttpsError("permission-denied", "Unauthorized.");
  }

  const id = `${roundId}_${judgeId}_${teamId}`;
  const ref = db.collection("evaluationAssignments").doc(id);

  // Soft delete
  await ref.update({
    status: 'REMOVED',
    removedAt: new Date().toISOString(),
    removedByUid: actorUid
  });

  await db.collection("auditLogs").add({
    action: "REMOVE_ASSIGNMENT",
    actorId: actorUid,
    targetId: id,
    timestamp: new Date().toISOString(),
    details: `Removed judge ${judgeId} from team ${teamId} in round ${roundId}`
  });

  return { success: true };
});
