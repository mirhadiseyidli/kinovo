require('dotenv').config();
require('./database/connection');

const express = require('express');
const cors = require('cors');

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
// const storageRoutes = require('./routes/storageRoutes');

// Firebase and realtime services
const { configureSecurityRules } = require('./config/firebase-admin');
const { initializeChangeStreams } = require('./services/databaseListenerService');
const { shutdownWebSockets } = require('./utils/shutdownUtils');

const app = express();

// CORS Configuration
app.use(cors({
  origin: '*', // Allow all origins for mobile testing; secure this in production
}));

// Middleware
app.use(express.json()); // Parse JSON request bodies

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running.' });
});

// Initialize categories
const { initializeCategories } = require('./controllers/categoryController');
initializeCategories().catch(console.error);

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
// app.use('/api/storage', storageRoutes);

// Start the cron jobs
const accountDeletionCron = require('./cron/accountDeletionCron');
accountDeletionCron.start();

// Start Server
const PORT = process.env.BACKEND_PORT || 5002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});