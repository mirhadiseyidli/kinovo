require('dotenv').config();
require('./database/connection');

const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/authRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const userRoutes = require('./routes/userRoutes');
const aiRoutes = require('./routes/aiRoutes');
const manageFriendsRoutes = require('./routes/manageFriendsRoutes');
const searchRoutes = require('./routes/searchRoutes');
const friendSuggestions = require('./routes/userSuggestionsRoute')

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

// Check Authentication (JWT based)
const { verifyAccessToken } = require('./utils/token');

app.get('/api/check-auth', (req, res) => {
  // console.log(req)
  const token = req.headers.authorization?.split(' ')[1]; // Extract token from Authorization header
  if (!token) {
    return res.status(401).json({ loggedIn: false, message: 'No token provided' });
  }

  try {
    const decoded = verifyAccessToken(token);
    console.log('server decoded', decoded)
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
app.use('/api/token', tokenRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assistants', aiRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/managefriends', manageFriendsRoutes);
app.use('/api/friendsuggestions', friendSuggestions);

// Start Server
const PORT = process.env.BACKEND_PORT || 5002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});