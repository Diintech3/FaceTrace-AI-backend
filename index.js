require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const searchRoutes = require('./routes/searchRoutes');
const socialMediaRoutes = require('./routes/socialMediaRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (screenshots)
app.use('/screenshots', express.static('uploads/screenshots'));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Connect to Database
connectDB();

// Routes
app.get('/', (req, res) => {
  res.json({
    message: '🚀 DigitalTrace AI Backend Running',
    endpoints: {
      searchByUsername: 'POST /api/search/username',
      searchByImage: 'POST /api/search/image',
      searchByUrl: 'POST /api/search/url',
      extractFromUrl: 'POST /api/social/extract-url',
      findAllProfiles: 'POST /api/social/find-profiles'
    }
  });
});

app.use('/api', searchRoutes);
app.use('/api/social', socialMediaRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
});