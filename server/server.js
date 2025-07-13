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
const notificationsRoutes = require('./routes/notificationsRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const googleApiRoutes = require('./routes/googleApiRoutes');
const storageRoutes = require('./routes/storageRoutes');
const shareRoutes = require('./routes/shareRoutes');

// Firebase and realtime services
const { configureSecurityRules } = require('./config/firebase-admin');
const { initializeChangeStreams } = require('./services/databaseListenerService');

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
    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Database connection established successfully');

    // Initialize categories after database connection
    console.log('Initializing categories...');
    const { initializeCategories } = require('./controllers/categoryController');
    await initializeCategories();
    console.log('Categories initialized successfully');

    // Initialize Firebase Realtime Database
    configureSecurityRules().catch(error => {
      console.error('Failed to configure Firebase security rules:', error);
    });
    initializeChangeStreams();

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
    app.use('/api/assistants', aiRoutes);
    app.use('/api/search', searchRoutes);
    app.use('/api/managefriends', manageFriendsRoutes);
    app.use('/api/friendsuggestions', friendSuggestionsRoutes);
    app.use('/api/manageevents', eventsRoutes);
    app.use('/api/weather', weatherRoutes);
    app.use('/api/notifications', notificationsRoutes);
    app.use('/api', categoryRoutes);
    app.use('/api/google', googleApiRoutes);
    app.use('/api/storage', storageRoutes);
    app.use('/share', shareRoutes); // Share routes don't need /api prefix

    // Start the cron jobs
    const accountDeletionCron = require('./cron/accountDeletionCron');

    accountDeletionCron.start();

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