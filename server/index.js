const categoryRoutes = require('./routes/categoryRoutes');
const { initializeCategories } = require('./controllers/categoryController');

// Initialize categories
initializeCategories().catch(console.error);

// Routes
app.use('/api', categoryRoutes); 