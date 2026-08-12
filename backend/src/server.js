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
  const pool = require('./config/db');
  const bcrypt = require('bcryptjs');
  const result = {};

  // 1. MySQL connection
  try {
    const [rows] = await pool.query('SELECT 1 AS val');
    result.mysql = rows[0].val === 1 ? 'SUCCESS' : 'FAILED';
  } catch (err) {
    result.mysql = 'FAILED';
    result.mysqlError = err.code || err.message;
  }

  // 2. Tables
  if (result.mysql === 'SUCCESS') {
    try {
      const [tables] = await pool.query(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'"
      );
      result.tables = tables.length > 0 ? 'EXISTS' : 'MISSING';
    } catch (err) {
      result.tables = 'ERROR';
      result.tablesError = err.code || err.message;
    }
  }

  // 3. Admin user
  if (result.mysql === 'SUCCESS') {
    try {
      const [users] = await pool.query(
        'SELECT id, name, email, role, status, password FROM users WHERE email = ?',
        ['admin@touroperator.com']
      );
      if (users.length === 0) {
        result.adminUser = 'MISSING';
        const [cnt] = await pool.query('SELECT COUNT(*) as c FROM users');
        result.totalUsers = cnt[0].c;
      } else {
        result.adminUser = 'EXISTS';
        result.adminRole = users[0].role;
        result.adminStatus = users[0].status;

        // Password verification
        try {
          const isMatch = await bcrypt.compare('admin123', users[0].password);
          result.passwordVerification = isMatch ? 'SUCCESS' : 'FAILED';
          if (!isMatch) {
            result.passwordHashFormat = users[0].password.substring(0, 7);
          }
        } catch (err) {
          result.passwordVerification = 'ERROR';
          result.passwordError = err.code || err.message;
        }
      }
    } catch (err) {
      result.adminUser = 'ERROR';
      result.adminUserError = err.code || err.message;
    }
  }

  // 4. JWT_SECRET
  result.jwtSecret = process.env.JWT_SECRET ? 'SET' : 'NOT SET';

  // 5. Login API test
  if (result.mysql === 'SUCCESS' && result.adminUser === 'EXISTS' && result.passwordVerification === 'SUCCESS' && result.jwtSecret === 'SET') {
    try {
      const jwt = require('jsonwebtoken');
      const [users] = await pool.query(
        'SELECT id, email, role, name FROM users WHERE email = ?',
        ['admin@touroperator.com']
      );
      const u = users[0];
      const token = jwt.sign(
        { id: u.id, email: u.email, role: u.role, name: u.name },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      jwt.verify(token, process.env.JWT_SECRET);
      result.loginApi = 'SUCCESS';
    } catch (err) {
      result.loginApi = 'FAILED';
      result.loginApiError = err.code || err.message;
    }
  } else {
    result.loginApi = 'SKIPPED';
  }

  res.json(result);
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
