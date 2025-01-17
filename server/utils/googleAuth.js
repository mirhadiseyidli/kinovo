const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyIdToken(idToken) {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID, // Ensure this matches your client ID
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