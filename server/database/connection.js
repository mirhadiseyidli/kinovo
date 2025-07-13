require('dotenv').config();
const mongoose = require('mongoose');

// Optimize for Lambda environment
const connectOptions = {
  // Connection timeout settings
  serverSelectionTimeoutMS: 5000, // 5 seconds timeout for server selection
  socketTimeoutMS: 45000, // 45 seconds socket timeout
  connectTimeoutMS: 10000, // 10 seconds connection timeout
  
  // Connection pooling for Lambda
  maxPoolSize: 1, // Lambda functions are single-threaded, so 1 connection is enough
  minPoolSize: 0, // No minimum pool size
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  
  // Buffering settings
  bufferCommands: false, // Disable mongoose buffering
  bufferMaxEntries: 0, // Disable mongoose buffering
  
  // Heartbeat settings
  heartbeatFrequencyMS: 10000, // Send heartbeat every 10 seconds
  
  // Retry settings
  retryWrites: true,
  retryReads: true
};

// Cache connection for Lambda reuse
let cachedConnection = null;

async function connectToDatabase() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('Using cached MongoDB connection');
    return cachedConnection;
  }

  try {
    console.log('Establishing new MongoDB connection...');
    cachedConnection = await mongoose.connect(process.env.MONGODB_URI, connectOptions);
    console.log('Connected to MongoDB successfully');
    return cachedConnection;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw error;
  }
}

// For Lambda functions, connect on demand
if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
  // In Lambda environment, don't auto-connect
  module.exports = { connectToDatabase };
} else {
  // In regular server environment, auto-connect
  connectToDatabase().catch(err => console.error('Initial connection failed:', err));
}

const db = mongoose.connection;
db.on('error', (error) => console.error('MongoDB connection error:', error));
db.on('disconnected', () => console.log('MongoDB disconnected'));
db.once('open', () => console.log('MongoDB connection established'));

module.exports = { connectToDatabase };
