require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { connectToDatabase } = require('./database/connection');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const aiRoutes = require('./routes/aiRoutes');
const manageFriendsRoutes = require('./routes/manageFriendsRoutes');
const searchRoutes = require('./routes/searchRoutes');
const friendSuggestionsRoutes = require('./routes/userSuggestionsRoutes');
const eventsRoutes = require('./routes/eventsRoutes');
const weatherRoutes = require('./routes/appleWeatherRoutes');
const mapKitRoutes = require('./routes/appleMapKitRoutes');
const notificationsRoutes = require('./routes/notificationsRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const googleApiRoutes = require('./routes/googleApiRoutes');
const storageRoutes = require('./routes/storageRoutes');
const pushFetchRoutes = require('./routes/pushFetchRoutes');
const vectorSearchRoutes = require('./routes/vectorSearchRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Trust proxy - important for rate limiting behind nginx
app.set('trust proxy', 1);

// CORS Configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://kinovo.app', 'https://www.kinovo.app', 'https://admin.kinovo.app']
  : ['http://localhost:3000'];

app.use(cors({ origin: allowedOrigins, credentials: true }));

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(cookieParser()); // Parse cookies

// Import rate limiters
const {
  generalLimiter,
  authLimiter,
  twoFactorLimiter,
  aiLimiter,
  searchLimiter,
  eventWriteLimiter,
  eventReadLimiter,
  userReadLimiter,
  userWriteLimiter,
  friendsReadLimiter,
  friendsWriteLimiter,
  notificationReadLimiter,
  notificationWriteLimiter,
  pushNotificationLimiter,
  weatherLimiter,
  mapKitLimiter,
  googleApiLimiter,
  storageLimiter,
  categoryLimiter
} = require('./middleware/rateLimiter');

// Apply general rate limiting to all API routes
app.use('/api/', generalLimiter);

// Health Check Route
app.get('/api/health', async (req, res) => {
  const { checkVectorSearchHealth } = require('./services/vectorSearchInitializer');
  const vectorSearchStatus = await checkVectorSearchHealth();
  
  res.json({ 
    success: true, 
    message: 'Server is running.',
    vectorSearch: vectorSearchStatus
  });
});

// Initialize server with proper database connection
async function startServer() {
  try {
    // Ensure database connection is established
    await connectToDatabase();

    // Initialize categories after database connection
    const { initializeCategories } = require('./controllers/categoryController');
    await initializeCategories();

    // Initialize vector search capabilities
    // Set autoIndex to true if you want automatic indexing of data on startup
    const { initializeVectorSearch } = require('./services/vectorSearchInitializer');
    await initializeVectorSearch({ autoIndex: process.env.AUTO_INDEX_EMBEDDINGS === 'true' });

    // Initialize real-time analytics tracking
    const analyticsService = require('./services/analyticsService');
    await analyticsService.initializeChangeStreams();

    // Initialize session tracking
    const UserPresence = require('./database/schemas/userPresenceSchema');
    await UserPresence.initializeSessions();

    // Check Authentication (JWT based)
    const { verifyAccessToken } = require('./utils/token');

    app.get('/api/check-auth', (req, res) => {
      const token = req.headers.authorization?.split(' ')[1]; // Extract token from Authorization header
      if (!token) {
        return res.status(401).json({ loggedIn: false, message: 'No token provided' });
      }

      try {
        const decoded = verifyAccessToken(token);
        res.json({
          loggedIn: true,
          user: { id: decoded.id, email: decoded.email, role: decoded.role },
        });
      } catch (err) {
        res.status(401).json({ loggedIn: false, message: 'Invalid or expired token' });
      }
    });

    // Routes with specific rate limiters
    app.use('/api/auth', authLimiter, authRoutes);
    app.use('/api/users', userRoutes); // Rate limiting applied within route file
    app.use('/api/ai', aiLimiter, aiRoutes);
    app.use('/api/search', searchLimiter, searchRoutes);
    app.use('/api/managefriends', manageFriendsRoutes); // Rate limiting applied within route file
    app.use('/api/friendsuggestions', friendSuggestionsRoutes); // Rate limiting applied within route file
    app.use('/api/manageevents', eventsRoutes); // Rate limiting applied within route file
    app.use('/api/weather', weatherLimiter, weatherRoutes);
    app.use('/api/mapkit', mapKitLimiter, mapKitRoutes);
    app.use('/api/notifications', notificationsRoutes); // Rate limiting applied within route file
    app.use('/api', categoryLimiter, categoryRoutes);
    app.use('/api/google', googleApiLimiter, googleApiRoutes);
    app.use('/api/storage', storageLimiter, storageRoutes);
    app.use('/api/push-fetch', pushNotificationLimiter, pushFetchRoutes);
    app.use('/api/vector-search', aiLimiter, vectorSearchRoutes);
    app.use('/api/analytics', analyticsRoutes);

    // Start the cron jobs
    const accountDeletionCron = require('./cron/accountDeletionCron');
    const { startNearbyEventsCron, startFriendsEventsCron } = require('./cron/nearbyEventsCron');
    const { startMapSnapshotCron } = require('./cron/mapSnapshotCron');
    const { startEmbeddingUpdateCron } = require('./cron/embeddingUpdateCron');

    accountDeletionCron.start();
    startNearbyEventsCron();
    startFriendsEventsCron();
    startMapSnapshotCron();
    startEmbeddingUpdateCron(); // Process embedding updates every 30 minutes

    // Start Server
    const PORT = process.env.BACKEND_PORT || 5002;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();