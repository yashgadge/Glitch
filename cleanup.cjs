const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Since we are running locally in the workspace, we can use application default credentials
// if gcloud auth application-default login was run.
// Wait, actually I don't have the service account key. 
// Firebase-admin requires credentials.
