require('dotenv').config();

const express = require('express');
const cors = require('cors');
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

// Database change streams removed (was Firebase)

const app = express();

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// CORS Configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://kinovo.app', 'https://www.kinovo.app']
  : ['http://localhost:3000'];

app.use(cors({ origin: allowedOrigins, credentials: true }));

// Middleware
app.use(express.json()); // Parse JSON request bodies

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running.' });
});

// Initialize server with proper database connection
async function startServer() {
  try {
    // Ensure database connection is established
    await connectToDatabase();

    // Initialize categories after database connection
    const { initializeCategories } = require('./controllers/categoryController');
    await initializeCategories();

    // Database change streams removed (was Firebase)

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

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/ai', aiRoutes);
    app.use('/api/search', searchRoutes);
    app.use('/api/managefriends', manageFriendsRoutes);
    app.use('/api/friendsuggestions', friendSuggestionsRoutes);
    app.use('/api/manageevents', eventsRoutes);
    app.use('/api/weather', weatherRoutes);
    app.use('/api/mapkit', mapKitRoutes);
    app.use('/api/notifications', notificationsRoutes);
    app.use('/api', categoryRoutes);
    app.use('/api/google', googleApiRoutes);
    app.use('/api/storage', storageRoutes);
    app.use('/api/push-fetch', pushFetchRoutes);

    // Start the cron jobs
    const accountDeletionCron = require('./cron/accountDeletionCron');
    const { startNearbyEventsCron, startFriendsEventsCron } = require('./cron/nearbyEventsCron');
    const { startMapSnapshotCron } = require('./cron/mapSnapshotCron');

    accountDeletionCron.start();
    startNearbyEventsCron();
    startFriendsEventsCron();
    startMapSnapshotCron();

    // Start Server
    const PORT = process.env.BACKEND_PORT || 5002;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();