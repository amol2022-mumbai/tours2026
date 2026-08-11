const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

const { migrate } = require('./migrate');

const frontendDist = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
const hasFrontend = fs.existsSync(frontendDist) && fs.existsSync(path.join(frontendDist, 'index.html'));

console.log('=== Startup Diagnostics ===');
console.log('__dirname:', __dirname);
console.log('frontendDist (resolved):', frontendDist);
console.log('frontendDist exists:', fs.existsSync(frontendDist));
console.log('index.html exists:', hasFrontend ? path.join(frontendDist, 'index.html') : 'MISSING');
console.log('CWD:', process.cwd());
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('PORT:', PORT);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

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

// 404 for unmatched /api routes (including bare /api)
app.all(['/api', '/api/*'], (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Serve frontend static files
if (hasFrontend) {
  app.use(express.static(frontendDist));

  // SPA fallback: any unmatched request returns index.html
  app.all('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
      if (err) {
        console.error('Failed to send index.html:', err.message);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to load frontend' });
        }
      }
    });
  });

  console.log('Mode: serving frontend + API');
} else {
  app.get('*', (req, res) => {
    if (!res.headersSent) {
      res.status(503).json({ error: 'Frontend not built' });
    }
  });
  console.log('Mode: API only (frontend/dist not found)');
}

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error'
  });
});

async function start() {
  let dbOk = false;

  if (process.env.SKIP_MIGRATION === 'true') {
    console.log('SKIP_MIGRATION=true -- skipping database connection and migration');
    dbOk = false;
  } else {
    try {
      console.log('Checking database connection...');
      await migrate();
      console.log('Database migration completed.');
      dbOk = true;
    } catch (err) {
      console.error('---');
      console.error('WARNING: Database connection or migration failed.');
      console.error('Error code:', err.code || 'UNKNOWN');
      console.error('Error message:', err.message);
      console.error('---');
      console.error('The server will start without a database connection.');
      console.error('Frontend pages will load, but API endpoints will return errors.');
      console.error('---');
      console.error('Debug info:');
      console.error('  DB_HOST:', process.env.DB_HOST || '(not set)');
      console.error('  DB_PORT:', process.env.DB_PORT || '(not set)');
      console.error('  DB_USER:', process.env.DB_USER || '(not set)');
      console.error('  DB_NAME:', process.env.DB_NAME || '(not set)');
      console.error('  DB_SSL:', process.env.DB_SSL || '(not set)');
      console.error('  DB_PASSWORD is set:', !!process.env.DB_PASSWORD);
      console.error('---');
    }
  }

  app.locals.dbConnected = dbOk;

  app.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log(`Server running on port ${PORT}`);
    console.log(`Database: ${dbOk ? 'CONNECTED' : 'NOT CONNECTED'}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    if (hasFrontend) {
      console.log(`Frontend: http://localhost:${PORT}/`);
    }
    console.log('========================================');
  });
}

start();

module.exports = app;
