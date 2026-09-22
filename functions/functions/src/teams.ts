import * as functions from "firebase-functions/v1";
import { getFirestore } from "firebase-admin/firestore";

export const advanceTeamState = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const { teamId, action } = data; // action: 'advance', 'return', 'eliminate', 'disqualify', 'promote'
  const nextRound = data.nextRound; // optional for 'promote'

  if (!teamId || !action) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
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
    throw new functions.https.HttpsError("permission-denied", "Only organizers can manually advance or change team state.");
  }

  return await db.runTransaction(async (transaction) => {
    const teamRef = db.collection("teams").doc(teamId);
    const teamSnap = await transaction.get(teamRef);
    if (!teamSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Team not found.");
    }

    const teamData = teamSnap.data()!;
    const currentRound = teamData.currentRound || 0;
    const nowIso = new Date().toISOString();
    
    let updates: any = {};
    let auditDetails = "";

    switch (action) {
      case 'advance':
        if (teamData.status === 'eliminated' || teamData.status === 'disqualified') {
          throw new functions.https.HttpsError("failed-precondition", "Cannot advance eliminated team.");
        }
        updates = {
          currentRound: currentRound + 1,
          previousRound: currentRound,
          status: (currentRound + 1) >= 1 ? `round_${currentRound + 1}` : 'qualified',
          lastStatusUpdate: nowIso,
          updatedAt: nowIso
        };
        auditDetails = `Advanced from round ${currentRound} to ${currentRound + 1}`;
        break;

      case 'return':
        if (currentRound <= 0) {
          throw new functions.https.HttpsError("failed-precondition", "Team is already at start.");
        }
        updates = {
          currentRound: currentRound - 1,
          previousRound: currentRound,
          status: (currentRound - 1) >= 1 ? `round_${currentRound - 1}` : 'qualified',
          lastStatusUpdate: nowIso,
          updatedAt: nowIso
        };
        auditDetails = `Returned from round ${currentRound} to ${currentRound - 1}`;
        break;

      case 'promote':
        if (nextRound === undefined) {
          throw new functions.https.HttpsError("invalid-argument", "nextRound is required for promote action.");
        }
        updates = {
          currentRound: nextRound,
          previousRound: currentRound,
          status: nextRound >= 1 ? `round_${nextRound}` : 'qualified',
          lastStatusUpdate: nowIso,
          updatedAt: nowIso
        };
        auditDetails = `Promoted from round ${currentRound} to ${nextRound}`;
        break;

      case 'eliminate':
        updates = { status: 'eliminated', lastStatusUpdate: nowIso, updatedAt: nowIso };
        auditDetails = `Eliminated at round ${currentRound}`;
        break;

      case 'disqualify':
        updates = { status: 'disqualified', lastStatusUpdate: nowIso, updatedAt: nowIso };
        auditDetails = `Disqualified at round ${currentRound}`;
        break;

      default:
        throw new functions.https.HttpsError("invalid-argument", "Invalid action.");
    }

    transaction.update(teamRef, updates);

    const auditRef = db.collection("auditLogs").doc();
    transaction.set(auditRef, {
      action: `TEAM_${action.toUpperCase()}`,
      actorId: actorUid,
      targetId: teamId,
      entityType: "team",
      details: auditDetails,
      timestamp: nowIso
    });

    return { success: true, updates };
  });
});
