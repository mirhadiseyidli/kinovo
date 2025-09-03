require('dotenv').config();
const mongoose = require('mongoose');

// Base connection options
const baseConnectOptions = {
  // Connection timeout settings
  serverSelectionTimeoutMS: 5000, // 5 seconds timeout for server selection
  socketTimeoutMS: 45000, // 45 seconds socket timeout
  connectTimeoutMS: 10000, // 10 seconds connection timeout
  
  // Connection pooling
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 1, // Minimum number of connections in the pool
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  
  // Heartbeat settings
  heartbeatFrequencyMS: 10000, // Send heartbeat every 10 seconds
  
  // Retry settings
  retryWrites: true,
  retryReads: true
};

// Lambda-specific options
const lambdaConnectOptions = {
  ...baseConnectOptions,
  // For Lambda, use smaller connection pool
  maxPoolSize: 1, // Lambda functions are single-threaded
  minPoolSize: 0, // No minimum pool size for Lambda
  
  // Disable buffering for Lambda to fail fast
  bufferCommands: false,
};

// Cache connection for Lambda reuse
let cachedConnection = null;
let listenersAttached = false;

async function connectToDatabase() {
  // Check if we already have a good connection
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('Using cached MongoDB connection');
    return cachedConnection;
  }

  try {
    console.log('Establishing new MongoDB connection...');
    
    // Use Lambda-specific options if in Lambda environment
    const options = process.env.AWS_LAMBDA_FUNCTION_NAME 
      ? lambdaConnectOptions 
      : baseConnectOptions;
    
    cachedConnection = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('Connected to MongoDB successfully');
    
    // Setup connection event listeners with proper cleanup
    setupConnectionListeners();
    
    return cachedConnection;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw error;
  }
}

function setupConnectionListeners() {
  const db = mongoose.connection;
  
  // Increase max listeners to prevent warning
  db.setMaxListeners(20);
  
  // Remove existing listeners to prevent duplicates
  db.removeAllListeners('error');
  db.removeAllListeners('disconnected');
  db.removeAllListeners('connected');
  db.removeAllListeners('reconnected');
  
  // Setup listeners with proper cleanup tracking
  if (!listenersAttached) {
    db.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });
    
    db.on('disconnected', () => {
      console.log('MongoDB disconnected');
      // Reset connection cache and listeners flag on disconnect
      cachedConnection = null;
      listenersAttached = false;
    });
    
    db.on('connected', () => {
      console.log('MongoDB connection established');
    });
    
    db.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
    
    listenersAttached = true;
  }
}

// Handle different environments
if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
  // In Lambda environment, don't auto-connect - connect on demand
  console.log('Lambda environment detected - connection will be established on demand');
} else {
  // In regular server environment, auto-connect with buffering enabled
  console.log('Server environment detected - establishing connection...');
  connectToDatabase().catch(err => {
    console.error('Initial connection failed:', err);
    // In server environment, retry connection after a delay
    setTimeout(() => {
      connectToDatabase().catch(retryErr => {
        console.error('Retry connection failed:', retryErr);
      });
    }, 5000);
  });
}

module.exports = { connectToDatabase };
