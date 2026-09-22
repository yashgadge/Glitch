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
exports.submitProject = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const firestore_1 = require("firebase-admin/firestore");
exports.submitProject = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
    }
    const { teamId, roundId, fields, changeSummary } = data;
    if (!teamId || roundId === undefined || !fields) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
    }
    const db = (0, firestore_1.getFirestore)();
    const actorUid = context.auth.uid;
    return await db.runTransaction(async (transaction) => {
        // 1. Fetch Team and verify actor is the Team Leader
        const teamRef = db.collection("teams").doc(teamId);
        const teamSnap = await transaction.get(teamRef);
        if (!teamSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Team not found.");
        }
        const teamData = teamSnap.data();
        if (teamData.leaderId !== actorUid) {
            // In a real scenario, admins might submit on behalf, but for now we enforce leader only.
            const actorDoc = await transaction.get(db.collection("staff").doc(actorUid));
            if (!actorDoc.exists || !["organizer", "super_admin"].includes(actorDoc.data().role || "")) {
                throw new functions.https.HttpsError("permission-denied", "Only the Team Leader can submit.");
            }
        }
        if (teamData.eliminated || teamData.disqualified) {
            throw new functions.https.HttpsError("failed-precondition", "Team is disqualified or eliminated.");
        }
        // 2. Fetch Round to verify deadline
        const roundRef = db.collection("rounds").doc(String(roundId));
        const roundSnap = await transaction.get(roundRef);
        if (!roundSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Round not found.");
        }
        const roundData = roundSnap.data();
        if (!roundData.status.includes("OPEN")) {
            throw new functions.https.HttpsError("failed-precondition", "Round is not open for submissions.");
        }
        const nowMs = Date.now();
        let isLate = false;
        if (roundData.submissionCloseAt) {
            const closeMs = new Date(roundData.submissionCloseAt).getTime();
            if (nowMs > closeMs) {
                // Enforce hard cutoff if exists, else mark as late.
                if (roundData.hardCutoffAt && nowMs > new Date(roundData.hardCutoffAt).getTime()) {
                    throw new functions.https.HttpsError("failed-precondition", "Submission hard cutoff has passed.");
                }
                isLate = true;
            }
        }
        // 3. Process Submission
        const subId = `${teamId}_${roundId}`;
        const subRef = db.collection("submissions").doc(subId);
        const subSnap = await transaction.get(subRef);
        const currentVersion = subSnap.exists ? (subSnap.data().currentVersion || 1) : 1;
        let newVersionNumber = currentVersion;
        if (subSnap.exists && ['submitted', 'late', 'under_review', 'evaluated'].includes(subSnap.data().status)) {
            if (newVersionNumber >= 3) {
                throw new functions.https.HttpsError("failed-precondition", "Maximum revisions reached.");
            }
            newVersionNumber = currentVersion + 1;
        }
        const vId = `${subId}_v${newVersionNumber}`;
        const vRef = db.collection("submissionVersions").doc(vId);
        const status = isLate ? 'late' : (newVersionNumber > 1 ? 'revision_submitted' : 'submitted');
        const nowIso = new Date(nowMs).toISOString();
        transaction.set(subRef, {
            teamId,
            roundId,
            currentVersion: newVersionNumber,
            status,
            updatedAt: nowIso
        }, { merge: true });
        transaction.set(vRef, {
            submissionId: subId,
            teamId,
            roundId,
            versionNumber: newVersionNumber,
            previousVersionId: newVersionNumber > 1 ? `${subId}_v${newVersionNumber - 1}` : null,
            fields,
            changeSummary: changeSummary || null,
            status: isLate ? 'late' : 'submitted',
            submittedAt: nowIso,
            submittedByUid: actorUid,
            createdAt: nowIso
        }, { merge: true });
        // 4. Audit Log
        const auditRef = db.collection("auditLogs").doc();
        transaction.set(auditRef, {
            action: newVersionNumber > 1 ? "SUBMISSION_REVISED" : "PROJECT_SUBMITTED",
            actorId: actorUid,
            targetId: teamId,
            entityType: "team",
            details: `Round ${roundId}, Version ${newVersionNumber}${isLate ? ' (LATE)' : ''}`,
            timestamp: nowIso
        });
        return { success: true, version: newVersionNumber, status };
    });
});
//# sourceMappingURL=submissions.js.map