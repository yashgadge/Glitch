import * as functions from "firebase-functions/v1";
import { getFirestore } from "firebase-admin/firestore";

export const submitEvaluation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const { judgeId, teamId, roundId, criteriaScores, totalScore, feedback, status } = data;

  if (!judgeId || !teamId || roundId === undefined || !criteriaScores) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
  }

  const db = getFirestore();
  const actorUid = context.auth.uid;

  // Verify actor permission (must be judge or admin/organizer)
  if (actorUid !== judgeId) {
    const actorDoc = await db.collection("staff").doc(actorUid).get();
    if (!actorDoc.exists || !["organizer", "super_admin"].includes(actorDoc.data()!.role || "")) {
      throw new functions.https.HttpsError("permission-denied", "Cannot submit evaluation on behalf of another judge.");
    }
  } else {
    const actorDoc = await db.collection("staff").doc(actorUid).get();
    const roles = actorDoc.exists ? (actorDoc.data()!.roles || (actorDoc.data()!.role ? [actorDoc.data()!.role] : [])) : [];
    if (!roles.some((r: string) => ["judge", "mentor", "organizer", "super_admin"].includes(r))) {
      throw new functions.https.HttpsError("permission-denied", "Insufficient permissions to evaluate.");
    }
  }

  const evalId = `${judgeId}_${teamId}_${roundId}`;
  const docRef = db.collection('evaluations').doc(evalId);

  return await db.runTransaction(async (transaction) => {
    // 0. Check Assignment
    const assignmentRef = db.collection('evaluationAssignments').doc(`${roundId}_${judgeId}_${teamId}`);
    const assignmentSnap = await transaction.get(assignmentRef);
    if (!assignmentSnap.exists) {
      throw new functions.https.HttpsError("permission-denied", "Judge is not assigned to this team for this round.");
    }

    // 1. Check Team Status
    const teamRef = db.collection("teams").doc(teamId);
    const teamSnap = await transaction.get(teamRef);
    if (!teamSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Team not found.");
    }
    const teamData = teamSnap.data()!;
    if (teamData.eliminated || teamData.disqualified) {
      throw new functions.https.HttpsError("failed-precondition", "Team is disqualified or eliminated.");
    }

    // 2. Process Evaluation
    const currentDoc = await transaction.get(docRef);
    const currentVersion = currentDoc.exists ? currentDoc.data()!.version : 0;
    const isLocked = currentDoc.exists ? currentDoc.data()!.locked : false;

    if (isLocked) {
      throw new functions.https.HttpsError("failed-precondition", "This evaluation is locked and cannot be modified.");
    }

    const locked = status === 'submitted';
    const nowIso = new Date().toISOString();

    const finalEvaluation = {
      judgeId,
      teamId,
      roundId,
      criteriaScores,
      totalScore,
      feedback: feedback || "",
      status,
      locked,
      version: currentVersion + 1,
      timestamp: nowIso
    };

    transaction.set(docRef, finalEvaluation, { merge: true });

    // 3. Evaluation Versions
    if (locked) {
      const versionRef = db.collection('evaluationVersions').doc();
      transaction.set(versionRef, {
        evaluationId: evalId,
        versionNumber: finalEvaluation.version,
        criteriaScores: finalEvaluation.criteriaScores,
        totalScore: finalEvaluation.totalScore,
        feedback: finalEvaluation.feedback,
        submittedBy: actorUid,
        submittedAt: nowIso,
        locked: true
      });

      // 4. Audit Log
      const auditRef = db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        action: "EVALUATION_SUBMITTED",
        actorId: actorUid,
        targetId: teamId,
        entityType: "team",
        details: `Judge submitted evaluation for Round ${roundId}`,
        timestamp: nowIso
      });
    }

    return { success: true, version: finalEvaluation.version, locked };
  });
});

export const unlockEvaluation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const { evalId, reason } = data;
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
    throw new functions.https.HttpsError("permission-denied", "Only organizers can unlock evaluations.");
  }

  return await db.runTransaction(async (transaction) => {
    const docRef = db.collection('evaluations').doc(evalId);
    const currentDoc = await transaction.get(docRef);
    
    if (!currentDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Evaluation not found");
    }

    const currentData = currentDoc.data()!;
    const newVersion = currentData.version + 1;
    const nowIso = new Date().toISOString();

    transaction.update(docRef, { 
      locked: false,
      status: 'reopened',
      version: newVersion,
      timestamp: nowIso
    });

    const versionRef = db.collection('evaluationVersions').doc();
    transaction.set(versionRef, {
      evaluationId: evalId,
      versionNumber: newVersion,
      criteriaScores: currentData.criteriaScores,
      totalScore: currentData.totalScore,
      feedback: currentData.feedback,
      submittedBy: actorUid,
      submittedAt: nowIso,
      locked: false,
      reason: reason || 'Admin Reopen'
    });

    const auditRef = db.collection("auditLogs").doc();
    transaction.set(auditRef, {
      action: "EVALUATION_REOPENED",
      actorId: actorUid,
      targetId: currentData.teamId,
      entityType: "team",
      details: `Evaluation ${evalId} reopened: ${reason || 'No reason provided'}`,
      timestamp: nowIso
    });

    return { success: true };
  });
});

export const adminCorrectEvaluation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const { evalId, criteriaScores, totalScore, reason } = data;
  if (!reason) {
    throw new functions.https.HttpsError("invalid-argument", "A reason is required for admin corrections.");
  }

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
    throw new functions.https.HttpsError("permission-denied", "Only organizers can correct evaluations.");
  }

  return await db.runTransaction(async (transaction) => {
    const docRef = db.collection('evaluations').doc(evalId);
    const currentDoc = await transaction.get(docRef);
    
    if (!currentDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Evaluation not found");
    }

    const currentData = currentDoc.data()!;
    const newVersion = currentData.version + 1;
    const nowIso = new Date().toISOString();
    
    // Update current evaluation
    transaction.update(docRef, {
      criteriaScores: criteriaScores,
      totalScore: totalScore,
      version: newVersion,
      timestamp: nowIso
    });

    // Save version history
    const versionRef = db.collection('evaluationVersions').doc();
    transaction.set(versionRef, {
      evaluationId: evalId,
      versionNumber: newVersion,
      criteriaScores: criteriaScores,
      totalScore: totalScore,
      feedback: currentData.feedback,
      submittedBy: actorUid,
      submittedAt: nowIso,
      locked: currentData.locked,
      adminCorrected: true,
      reason: reason
    });

    // Create Audit Log
    const auditRef = db.collection('auditLogs').doc();
    transaction.set(auditRef, {
      action: 'EVALUATION_CORRECTED',
      actorId: actorUid,
      targetId: evalId,
      entityType: 'evaluation',
      details: `Score corrected from ${currentData.totalScore} to ${totalScore}. Reason: ${reason}`,
      timestamp: nowIso
    });

    return { success: true, newVersion };
  });
});
