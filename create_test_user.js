const admin = require('firebase-admin');

// Initialize Firebase Admin (assuming default credentials work here, e.g. GOOGLE_APPLICATION_CREDENTIALS or running locally where it can pick up the project config if logged in via CLI)
// Wait, actually, local scripts outside functions need service account credentials, or we can use the firebase functions shell/execution environment.
