const { OAuth2Client } = require('google-auth-library');

// Support both iOS and web client IDs
const IOS_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const WEB_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID;
const ALLOWED_AUDIENCES = [IOS_CLIENT_ID, WEB_CLIENT_ID];

const client = new OAuth2Client();

async function verifyIdToken(idToken) {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: ALLOWED_AUDIENCES, // Accept both iOS and web client IDs
    });
    const payload = ticket.getPayload();

    // Example: Extract user info
    const userId = payload['sub'];
    const email = payload['email'];
    const name = payload['name'];

    return { userId, email, name, payload }; // Return the payload for additional use
  } catch (error) {
    throw new Error('Invalid idToken');
  }
}

module.exports = { verifyIdToken };