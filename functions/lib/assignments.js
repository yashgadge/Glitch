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
exports.removeAssignment = exports.assignJudgesBulk = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const firestore_1 = require("firebase-admin/firestore");
exports.assignJudgesBulk = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
    }
    const { assignmentsToCreate, assignmentsToRemove, roundId } = data;
    const db = (0, firestore_1.getFirestore)();
    const actorUid = context.auth.uid;
    // Verify permission
    const actorDoc = await db.collection("staff").doc(actorUid).get();
    if (!actorDoc.exists) {
        throw new functions.https.HttpsError("permission-denied", "Actor staff record not found.");
    }
    const roles = actorDoc.data().roles || (actorDoc.data().role ? [actorDoc.data().role] : []);
    if (!roles.some((r) => ["organizer", "super_admin", "admin"].includes(r))) {
        throw new functions.https.HttpsError("permission-denied", "Only organizers/admins can bulk assign.");
    }
    try {
        const batches = [];
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
            details: `Created ${(assignmentsToCreate === null || assignmentsToCreate === void 0 ? void 0 : assignmentsToCreate.length) || 0} assignments, Removed ${(assignmentsToRemove === null || assignmentsToRemove === void 0 ? void 0 : assignmentsToRemove.length) || 0} assignments for Round ${roundId}`
        });
        addWrite();
        commitCurrentBatch();
        for (const batch of batches) {
            await batch.commit();
        }
        return {
            success: true,
            processed: ((assignmentsToCreate === null || assignmentsToCreate === void 0 ? void 0 : assignmentsToCreate.length) || 0) + ((assignmentsToRemove === null || assignmentsToRemove === void 0 ? void 0 : assignmentsToRemove.length) || 0)
        };
    }
    catch (err) {
        console.error("Bulk assign error:", err);
        throw new functions.https.HttpsError("internal", err.message || "Bulk assign failed.");
    }
});
exports.removeAssignment = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
    const { roundId, judgeId, teamId } = data;
    const db = (0, firestore_1.getFirestore)();
    const actorUid = context.auth.uid;
    const actorDoc = await db.collection("staff").doc(actorUid).get();
    const roles = actorDoc.exists ? (actorDoc.data().roles || (actorDoc.data().role ? [actorDoc.data().role] : [])) : [];
    if (!roles.some((r) => ["organizer", "super_admin", "admin"].includes(r))) {
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
//# sourceMappingURL=assignments.js.map