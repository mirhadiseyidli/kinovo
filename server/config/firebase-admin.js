const admin = require('firebase-admin');
const serviceAccount = require("../firebase-service-account.json");

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

// Export the admin for auth verification
module.exports = { admin };