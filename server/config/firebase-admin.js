const admin = require('firebase-admin');
const serviceAccount = require("../firebase-service-account.json");

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

const configureSecurityRules = async () => {
  try {
    // This is a programmatic way to set security rules
    // You can also set these rules in the Firebase console
    await admin.database().setRules({
      rules: {
        ".read": false,
        ".write": false,
        "friend_requests": {
          "$userId": {
            ".read": "$userId === auth.uid",
            ".write": false
          }
        },
        "friend_activities": {
          "$userId": {
            ".read": "$userId === auth.uid",
            ".write": false
          }
        },
        "notifications": {
          "$userId": {
            ".read": "$userId === auth.uid",
            ".write": "$userId === auth.uid"
          }
        },
        "ai_summaries": {
          "$userId": {
            ".read": "$userId === auth.uid",
            ".write": false
          }
        },
        "user_status": {
          "$userId": {
            ".read": true, // Everyone can see who's online
            ".write": "$userId === auth.uid" // Only own status
          }
        }
      }
    });
  } catch (error) {
    console.error('Error setting security rules:', error);
  }
};

// Export the admin and database objects
console.log('admin', admin);
const db = admin.database();
module.exports = { admin, db, configureSecurityRules };