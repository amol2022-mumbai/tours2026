const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

const frontendDist = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
const hasFrontend = fs.existsSync(frontendDist);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/diag', async (req, res) => {
  const r = {};
  try {
    const pool = require('./config/db');
    await pool.query('SELECT 1');
    r.mysql = 'OK';
  } catch (e) { r.mysql = e.code || 'ERROR'; r.mysqlMsg = e.message; }
  r.jwt = process.env.JWT_SECRET ? 'OK' : 'MISSING';
  r.dbHost = process.env.DB_HOST || '(default)';
  r.dbUser = process.env.DB_USER || '(default)';
  r.dbName = process.env.DB_NAME || '(default)';
  res.json(r);
});

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

app.all('/api', (req, res) => res.status(404).json({ error: 'API route not found' }));
app.all('/api/*', (req, res) => res.status(404).json({ error: 'API route not found' }));

if (hasFrontend) {
  app.use(express.static(frontendDist));
  app.all('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ error: 'Failed to load frontend' });
      }
    });
  });
} else {
  app.all('*', (req, res) => {
    res.status(503).json({ error: 'Frontend not found' });
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend: ${hasFrontend ? 'serving' : 'not found'}`);
});

// Run migration AFTER server is already listening so Passenger sees the app as ready
if (process.env.SKIP_MIGRATION !== 'true') {
  const { migrate } = require('./migrate');
  migrate()
    .then(() => console.log('Database migration completed'))
    .catch((err) => {
      console.error('Database migration failed:', err.code || 'UNKNOWN', err.message);
      console.error('Server running without database');
    });
} else {
  console.log('SKIP_MIGRATION=true -- skipping database migration');
}

module.exports = app;
