# PHASE 2 FIREBASE SETUP REQUIREMENTS

Before testing the Phase 2 Identity & Onboarding Engine, the following manual configuration must be completed in your Firebase Console.

## 1. Authentication Providers

Navigate to **Authentication > Sign-in method** and enable:
- **Email/Password**
- **Google** (Optional for public, but required if any staff use it)

## 2. Firestore Indexes

Navigate to **Firestore Database > Indexes** and ensure the following Composite Indexes exist if not auto-created:

- Collection: `participants`
  - Field: `role`, Order: `Ascending`
  - Field: `createdAt`, Order: `Descending`
- Collection: `staff`
  - Field: `role`, Order: `Ascending`
  - Field: `createdAt`, Order: `Descending`

## 3. Firestore Security Rules

Ensure your rules securely handle the `system/counters` document for ID generation.

**IMPORTANT: Only copy the code starting from `rules_version = '2';` to the final `}`. Do not copy the ```javascript and ``` backticks.**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Admins can read/write everything.
    function isSuperAdmin() {
      return request.auth != null && get(/databases/$(database)/documents/staff/$(request.auth.uid)).data.role == 'super_admin';
    }

    match /participants/{userId} {
      // Participants can only read/write their own document
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // Admins can manage all participants
      allow read, write: if isSuperAdmin();
    }
    
    match /staff/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow read, write: if isSuperAdmin();
    }

    match /system/counters {
      // Allowed for Super Admins during import process
      allow read, write: if isSuperAdmin();
    }
    
    match /system/eventConfig {
      allow read: if true;
      allow write: if isSuperAdmin();
    }
    
    match /audit_logs/{logId} {
      allow read: if isSuperAdmin();
      allow write: if request.auth != null; // Typically restricted to backend, but allowed here for client-side auditing
    }
  }
}
```

## 4. Counter Initialization

Since the ID generation relies on a Firestore counter, you must manually create the initial counter document.

1. Go to **Firestore Database**
2. Create Collection: `system`
3. Add Document ID: `counters`
4. Add Field: `participantCount` (Type: Number, Value: `0`)
5. Add Field: `staffCount` (Type: Number, Value: `0`)

> **Note:** If `system/counters` does not exist during the first Devnovate Import, the import wizard will automatically attempt to create it (assuming the user is a Super Admin). However, creating it manually prevents permission/race condition warnings.
