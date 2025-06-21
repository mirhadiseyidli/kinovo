const admin = require('firebase-admin');
// const serviceAccount = require("../firebase-service-account.json");

// Initialize Firebase Admin with service account
// You should have your service account JSON file in a secure location
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`,
  universe_domain: "googleapis.com"
};

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