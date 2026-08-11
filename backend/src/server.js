const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

const { migrate } = require('./migrate');

const frontendDist = path.join(__dirname, '../../frontend/dist');
const serveFrontend = fs.existsSync(frontendDist);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV || 'development' });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/tours', require('./routes/tours'));
app.use('/api/itinerary', require('./routes/itinerary'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/profitability', require('./routes/profitability'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/marketing', require('./routes/marketing'));
app.use('/api/reminders', require('./routes/reminders'));

// Serve frontend static files when the build exists
if (serveFrontend) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
  console.log('Serving frontend from', frontendDist);
} else {
  console.log('Frontend build not found at', frontendDist, '- running API only');
}

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: serveFrontend ? 'Internal Server Error' : err.message
  });
});

async function start() {
  try {
    if (process.env.SKIP_MIGRATION === 'true') {
      console.log('SKIP_MIGRATION=true -- skipping database connection and migration');
    } else {
      console.log('Checking database connection...');
      await migrate();
      console.log('Database migration completed.');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Tour Operator API running on port ${PORT}`);
      console.log(`Mode: ${serveFrontend ? 'serving frontend + API' : 'API only'}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('---');
    console.error('DEPLOYMENT FAILED: Could not connect to database or run migrations.');
    console.error('Error code:', err.code || 'UNKNOWN');
    console.error('Error message:', err.message);
    console.error('---');
    console.error('Check your environment variables:');
    console.error('  DB_HOST:', process.env.DB_HOST || '(not set)');
    console.error('  DB_PORT:', process.env.DB_PORT || '(not set)');
    console.error('  DB_USER:', process.env.DB_USER || '(not set)');
    console.error('  DB_NAME:', process.env.DB_NAME || '(not set)');
    console.error('  DB_SSL:', process.env.DB_SSL || '(not set)');
    console.error('  (DB_PASSWORD is set) :', !!process.env.DB_PASSWORD);
    console.error('---');
    console.error('Common fixes:');
    console.error('  1. Verify MySQL credentials in Hostinger env vars');
    console.error('  2. Ensure MySQL user has access from Hostinger app server');
    console.error('  3. Try DB_SSL=true if Hostinger requires SSL');
    console.error('  4. Test with SKIP_MIGRATION=true to isolate DB issue');
    console.error('---');
    process.exit(1);
  }
}

start();

module.exports = app;
