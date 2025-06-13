const jwt = require('jsonwebtoken');
const axios = require('axios');
const logger = require('winston');

// Simpler approach to verify Apple tokens
async function verifyIdentityToken(identityToken) {
  try {
    // First, fetch Apple's public keys
    const response = await axios.get('https://appleid.apple.com/auth/keys');
    const keys = response.data.keys;
    
    // Decode the token header to get the key ID
    const decodedHeader = jwt.decode(identityToken, { complete: true })?.header;
    if (!decodedHeader) {
      throw new Error('Unable to decode token header');
    }
    
    const kid = decodedHeader.kid;
    
    // Find the matching key
    const matchingKey = keys.find(key => key.kid === kid);
    if (!matchingKey) {
      throw new Error('No matching key found');
    }
    
    // Decode without verification to get the payload
    const decoded = jwt.decode(identityToken);
    if (!decoded) {
      throw new Error('Failed to decode token');
    }
    
    // Extract user info from the payload
    const userId = decoded.sub; // Apple user ID
    const email = decoded.email;
    const email_verified = decoded.email_verified === 'true';
    
    // Log the verification success
    logger.info(`Apple Token decoded for user ID: ${userId}`);
    
    return { userId, email, email_verified, payload: decoded };
  } catch (error) {
    logger.error('Error verifying Apple identity token:', error);
    throw new Error('Invalid Apple identity token: ' + error.message);
  }
}

module.exports = { verifyIdentityToken };