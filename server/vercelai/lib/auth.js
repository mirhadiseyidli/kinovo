// JWT Authentication for AI tools
import jwt from 'jsonwebtoken';

export async function verifyUserToken(token) {
  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    return {
      userId: decoded._id,
      email: decoded.email,
    };
  } catch (error) {
    console.error('Token verification failed:', error.message);
    throw new Error('Invalid token');
  }
}

export function extractTokenFromHeaders(headers) {
  const authHeader = headers.authorization || headers.Authorization;
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }

  return null;
}