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

app.get('/api/diagnose', async (req, res) => {
  const r = {};

  // 0. Env var presence (no values)
  r.envVars = {
    DB_HOST: process.env.DB_HOST ? 'SET' : 'MISSING',
    DB_PORT: process.env.DB_PORT ? 'SET' : 'MISSING',
    DB_USER: process.env.DB_USER ? 'SET' : 'MISSING',
    DB_PASSWORD: process.env.DB_PASSWORD ? 'SET' : 'MISSING',
    DB_NAME: process.env.DB_NAME ? 'SET' : 'MISSING',
    JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV || 'MISSING',
    PORT: process.env.PORT ? 'SET' : 'MISSING',
  };
  r.envFileOnDisk = fs.existsSync(path.resolve(__dirname, '..', '.env'));

  // 0.1 Actual connection values (NO password)
  r.dbConfig = {
    host: process.env.DB_HOST || '(default: localhost)',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || '(default: root)',
    database: process.env.DB_NAME || '(default: tour_operator)',
  };
  r.dbConfigSource = {
    host: process.env.DB_HOST ? 'process.env' : 'fallback',
    port: process.env.DB_PORT ? 'process.env' : 'fallback',
    user: process.env.DB_USER ? 'process.env' : 'fallback',
    password: process.env.DB_PASSWORD ? 'process.env' : 'fallback(empty)',
    database: process.env.DB_NAME ? 'process.env' : 'fallback',
  };

  try {
    const pool = require('./config/db');
    const bcrypt = require('bcryptjs');
    const mysql = require('mysql2/promise');

    // 0.2 Cross-check: pool config vs process.env
    try {
      const getCfg = pool.__getConfig;
      if (getCfg) {
        const cfg = getCfg();
        r.poolMatchesEnv = {
          host: (cfg.host === process.env.DB_HOST),
          port: (cfg.port === parseInt(process.env.DB_PORT || '3306', 10)),
          user: (cfg.user === process.env.DB_USER),
          database: (cfg.database === process.env.DB_NAME),
        };
        r.poolConfig = { ...cfg, ssl: typeof cfg.ssl !== 'undefined' };
      }
    } catch (_) { /* pool inspection failed */ }

    // 0.3 Direct connection test (fresh, from process.env, no pool)
    try {
      const directConn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectTimeout: 10000,
      });
      await directConn.query('SELECT 1');
      r.directConnection = 'SUCCESS';
      await directConn.end();
    } catch (e) {
      r.directConnection = 'FAILED';
      r.directError = e.code || 'UNKNOWN';
      r.directMessage = e.message;
    }

    // 1. MySQL connection (pool)
    try {
      await pool.query('SELECT 1');
      r.mysql = 'SUCCESS';
    } catch (e) {
      r.mysql = 'FAILED';
      r.mysqlError = e.code || 'UNKNOWN';
      r.mysqlMessage = e.message;
      return res.json(r);
    }

    // 2. Required database tables
    const requiredTables = [
      'users', 'leads', 'followups', 'customers', 'tour_packages',
      'itinerary_days', 'suppliers', 'quotations', 'bookings',
      'payments', 'expenses', 'documents', 'marketing_leads',
      'reminders', 'alerts', 'tour_transport', 'tour_hotels'
    ];
    const [existing] = await pool.query(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
      [process.env.DB_NAME]
    );
    const existingNames = existing.map(t => t.TABLE_NAME);
    const missingTables = requiredTables.filter(t => !existingNames.includes(t));
    r.tables = missingTables.length === 0 ? 'EXISTS' : 'MISSING';
    if (missingTables.length > 0) r.missingTables = missingTables;

    // 3. Admin user existence
    const [adminRows] = await pool.query(
      'SELECT id, name, email, password, role, status FROM users WHERE email = ?',
      ['admin@touroperator.com']
    );
    r.adminUser = adminRows.length > 0 ? 'EXISTS' : 'MISSING';

    // 4. Password verification
    if (adminRows.length > 0) {
      try {
        const pwMatch = await bcrypt.compare('admin123', adminRows[0].password);
        r.passwordCheck = pwMatch ? 'SUCCESS' : 'FAILED';
      } catch (e) {
        r.passwordCheck = 'ERROR';
        r.passwordError = 'hash verification failed';
      }
    } else {
      r.passwordCheck = 'SKIPPED';
    }

    // 5. JWT configuration
    r.jwtSecret = process.env.JWT_SECRET ? 'SET' : 'MISSING';
    r.jwtExpires = process.env.JWT_EXPIRES_IN || '7d';

    // 6. Test JWT sign
    if (process.env.JWT_SECRET && adminRows.length > 0) {
      try {
        const jwt = require('jsonwebtoken');
        const testToken = jwt.sign({ id: 0 }, process.env.JWT_SECRET, { expiresIn: '1s' });
        r.jwtTest = testToken ? 'SUCCESS' : 'FAILED';
      } catch (e) {
        r.jwtTest = 'FAILED';
        r.jwtTestError = e.message;
      }
    }

  } catch (e) {
    r.error = e.message;
  }

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
