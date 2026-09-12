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
exports.redeemEntitlement = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const firestore_1 = require("firebase-admin/firestore");
exports.redeemEntitlement = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
    }
    const { entitlementId, productId, participantId, teamId, location, method, quantityToRedeem, requestId } = data;
    if ((!entitlementId && !productId) || !participantId || !quantityToRedeem || !requestId) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
    }
    const db = (0, firestore_1.getFirestore)();
    const actorUid = context.auth.uid;
    // Verify actor permission (must be volunteer, coordinator, organizer, or super_admin)
    const actorDoc = await db.collection("staff").doc(actorUid).get();
    if (!actorDoc.exists) {
        throw new functions.https.HttpsError("permission-denied", "Actor staff record not found.");
    }
    const actorData = actorDoc.data();
    const roles = actorData.roles || (actorData.role ? [actorData.role] : []);
    if (!roles.some((r) => ["volunteer", "class_coordinator", "organizer", "super_admin"].includes(r))) {
        throw new functions.https.HttpsError("permission-denied", "Insufficient permissions to redeem entitlements.");
    }
    return await db.runTransaction(async (transaction) => {
        // Fetch Entitlements
        let entitlementsToConsume = [];
        if (entitlementId) {
            const entRef = db.collection('entitlements').doc(entitlementId);
            const entSnap = await transaction.get(entRef);
            if (!entSnap.exists) {
                throw new functions.https.HttpsError('not-found', 'Entitlement not found.');
            }
            entitlementsToConsume.push({ ref: entRef, data: entSnap.data() });
        }
        else if (productId) {
            const querySnapshot = await transaction.get(db.collection('entitlements')
                .where('participantId', '==', participantId)
                .where('productId', '==', productId)
                .where('status', '==', 'active'));
            if (querySnapshot.empty) {
                throw new functions.https.HttpsError('not-found', 'No active entitlements found for this product.');
            }
            // Sort to consume oldest first
            const docs = querySnapshot.docs.map(doc => ({ ref: doc.ref, data: doc.data() }));
            docs.sort((a, b) => new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime());
            entitlementsToConsume = docs;
        }
        // Validate Total Quantity
        let totalAvailable = 0;
        let entitlementType = entitlementsToConsume[0].data.entitlementType;
        let category = entitlementsToConsume[0].data.category;
        let resolvedProductId = entitlementsToConsume[0].data.productId;
        for (const ent of entitlementsToConsume) {
            // Validate Ownership
            if (ent.data.ownership === 'PARTICIPANT' && ent.data.participantId !== participantId) {
                throw new functions.https.HttpsError('permission-denied', 'Entitlement belongs to a different participant.');
            }
            if (ent.data.ownership === 'TEAM' && ent.data.teamId !== teamId) {
                throw new functions.https.HttpsError('permission-denied', 'Entitlement belongs to a different team.');
            }
            totalAvailable += (ent.data.quantityRemaining || 0);
        }
        if (entitlementType !== 'NON_CONSUMABLE' && entitlementType !== 'PERIOD_BASED' && entitlementType !== 'ACCESS_PASS') {
            if (totalAvailable < quantityToRedeem) {
                throw new functions.https.HttpsError('failed-precondition', `Insufficient total quantity. Remaining: ${totalAvailable}`);
            }
        }
        // Update Entitlement Balances Sequentially
        let remainingToRedeem = quantityToRedeem;
        const consumedEntitlementIds = [];
        if (entitlementType !== 'NON_CONSUMABLE' && entitlementType !== 'PERIOD_BASED' && entitlementType !== 'ACCESS_PASS') {
            for (const ent of entitlementsToConsume) {
                if (remainingToRedeem <= 0)
                    break;
                const availableInThis = ent.data.quantityRemaining;
                if (availableInThis > 0) {
                    const consumeHere = Math.min(availableInThis, remainingToRedeem);
                    const newRemaining = availableInThis - consumeHere;
                    const newUsed = (ent.data.quantityUsed || 0) + consumeHere;
                    transaction.update(ent.ref, {
                        quantityRemaining: newRemaining,
                        quantityUsed: newUsed,
                        status: newRemaining === 0 ? 'fully_redeemed' : 'active',
                        updatedAt: new Date().toISOString()
                    });
                    remainingToRedeem -= consumeHere;
                    consumedEntitlementIds.push(ent.ref.id);
                }
            }
        }
        else {
            consumedEntitlementIds.push(entitlementsToConsume[0].ref.id);
        }
        // 5. Create Redemption Record
        const recordId = `RED-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        const recordRef = db.collection('redemptionRecords').doc(recordId);
        const now = new Date().toISOString();
        const record = {
            id: recordId,
            participantId,
            teamId: teamId || null,
            entitlementIds: consumedEntitlementIds,
            productId: resolvedProductId,
            category: category,
            quantity: quantityToRedeem,
            volunteerUid: actorUid,
            volunteerName: actorData.name || "Unknown",
            location: location || "Unknown",
            method: method || "QR_SCAN",
            status: 'redeemed',
            requestId,
            timestamp: now
        };
        transaction.set(recordRef, record);
        // 6. Audit Log
        const auditRef = db.collection("auditLogs").doc();
        transaction.set(auditRef, {
            action: "ENTITLEMENT_REDEEMED",
            actorId: actorUid,
            targetId: participantId,
            entityType: "participant",
            details: `Redeemed ${quantityToRedeem} of ${resolvedProductId}`,
            timestamp: now
        });
        return record;
    });
});
//# sourceMappingURL=redemptions.js.map