"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.advanceTeamState = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const firestore_1 = require("firebase-admin/firestore");
exports.advanceTeamState = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
    }
    const { teamId, action } = data; // action: 'advance', 'return', 'eliminate', 'disqualify', 'promote'
    const nextRound = data.nextRound; // optional for 'promote'
    if (!teamId || !action) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
    }
    const db = (0, firestore_1.getFirestore)();
    const actorUid = context.auth.uid;
    // Verify actor permission
    const actorDoc = await db.collection("staff").doc(actorUid).get();
    if (!actorDoc.exists) {
        throw new functions.https.HttpsError("permission-denied", "Actor staff record not found.");
    }
    const actorData = actorDoc.data();
    const roles = actorData.roles || (actorData.role ? [actorData.role] : []);
    if (!roles.some((r) => ["organizer", "super_admin"].includes(r))) {
        throw new functions.https.HttpsError("permission-denied", "Only organizers can manually advance or change team state.");
    }
    return await db.runTransaction(async (transaction) => {
        const teamRef = db.collection("teams").doc(teamId);
        const teamSnap = await transaction.get(teamRef);
        if (!teamSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Team not found.");
        }
        const teamData = teamSnap.data();
        const currentRound = teamData.currentRound || 0;
        const nowIso = new Date().toISOString();
        let updates = {};
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
//# sourceMappingURL=teams.js.map