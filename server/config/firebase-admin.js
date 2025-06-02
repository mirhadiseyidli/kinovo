const admin = require('firebase-admin');
const serviceAccount = require("../firebase-service-account.json");

// Initialize Firebase Admin with service account
// You should have your service account JSON file in a secure location
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

module.exports = admin; 