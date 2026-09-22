import * as functions from "firebase-functions/v1";
import { getFirestore } from "firebase-admin/firestore";

export const manageClassroomTeam = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const { action, teamId, roomId, oldRoomId } = data; // action: 'assign', 'remove', 'move'

  if (!action || !teamId || !roomId) {
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
  if (!roles.some((r: string) => ["organizer", "super_admin", "class_coordinator"].includes(r))) {
    throw new functions.https.HttpsError("permission-denied", "Insufficient permissions to manage classrooms.");
  }

  return await db.runTransaction(async (transaction) => {
    const teamRef = db.collection("teams").doc(teamId);
    const roomRef = db.collection("classrooms").doc(roomId);
    
    const [teamSnap, roomSnap] = await Promise.all([
      transaction.get(teamRef),
      transaction.get(roomRef)
    ]);

    if (!roomSnap.exists) throw new functions.https.HttpsError("not-found", "Classroom not found.");
    if (!teamSnap.exists) throw new functions.https.HttpsError("not-found", "Team not found.");

    const team = teamSnap.data()!;
    const classroom = roomSnap.data()!;
    const teamSize = (team.memberIds || []).length;
    const nowIso = new Date().toISOString();

    let oldRoomRef, oldRoomSnap, oldRoom;

    if (action === 'move') {
      if (!oldRoomId) throw new functions.https.HttpsError("invalid-argument", "oldRoomId is required for move.");
      oldRoomRef = db.collection("classrooms").doc(oldRoomId);
      oldRoomSnap = await transaction.get(oldRoomRef);
      if (!oldRoomSnap.exists) throw new functions.https.HttpsError("not-found", "Old classroom not found.");
      oldRoom = oldRoomSnap.data()!;
    }

    switch (action) {
      case 'assign':
        if (team.assignedRoom === roomId) throw new functions.https.HttpsError("already-exists", "Team already in this room.");
        if (team.assignedRoom && team.assignedRoom !== roomId) throw new functions.https.HttpsError("failed-precondition", "Team is in another room. Use move instead.");
        if (((classroom.currentOccupancy || 0) + teamSize) > classroom.capacity) {
          throw new functions.https.HttpsError("resource-exhausted", "Room capacity exceeded.");
        }

        const teamIdsAdd = classroom.teamIds || [];
        if (!teamIdsAdd.includes(teamId)) teamIdsAdd.push(teamId);

        transaction.update(roomRef, {
          teamIds: teamIdsAdd,
          currentOccupancy: (classroom.currentOccupancy || 0) + teamSize,
          updatedAt: nowIso
        });
        transaction.update(teamRef, { assignedRoom: roomId, updatedAt: nowIso });
        break;

      case 'remove':
        const teamIdsRem = (classroom.teamIds || []).filter((id: string) => id !== teamId);
        transaction.update(roomRef, {
          teamIds: teamIdsRem,
          currentOccupancy: Math.max(0, (classroom.currentOccupancy || 0) - teamSize),
          updatedAt: nowIso
        });
        if (team.assignedRoom === roomId) {
          transaction.update(teamRef, { assignedRoom: null, updatedAt: nowIso });
        }
        break;

      case 'move':
        if (team.assignedRoom !== oldRoomId) throw new functions.https.HttpsError("failed-precondition", "Team is not in the specified old room.");
        if (((classroom.currentOccupancy || 0) + teamSize) > classroom.capacity) {
          throw new functions.https.HttpsError("resource-exhausted", "New room capacity exceeded.");
        }

        let oldTeamIds = oldRoom!.teamIds || [];
        oldTeamIds = oldTeamIds.filter((id: string) => id !== teamId);
        
        transaction.update(oldRoomRef!, {
          teamIds: oldTeamIds,
          currentOccupancy: Math.max(0, (oldRoom!.currentOccupancy || 0) - teamSize),
          updatedAt: nowIso
        });

        const newTeamIds = classroom.teamIds || [];
        if (!newTeamIds.includes(teamId)) newTeamIds.push(teamId);

        transaction.update(roomRef, {
          teamIds: newTeamIds,
          currentOccupancy: (classroom.currentOccupancy || 0) + teamSize,
          updatedAt: nowIso
        });

        transaction.update(teamRef, { assignedRoom: roomId, updatedAt: nowIso });
        break;

      default:
        throw new functions.https.HttpsError("invalid-argument", "Invalid action.");
    }

    const auditRef = db.collection("auditLogs").doc();
    transaction.set(auditRef, {
      action: `TEAM_${action.toUpperCase()}_CLASSROOM`,
      actorId: actorUid,
      targetId: teamId,
      entityType: "team",
      details: `Action: ${action}, Room: ${roomId}${oldRoomId ? ', Old: '+oldRoomId : ''}`,
      timestamp: nowIso
    });

    return { success: true };
  });
});
