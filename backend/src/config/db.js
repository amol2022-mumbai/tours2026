const mysql = require('mysql2/promise');

let pool = null;
let poolConfig = null;

function getPool() {
  if (pool) return pool;
  poolConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
  };
  pool = mysql.createPool({
    host: poolConfig.host,
    port: poolConfig.port,
    user: poolConfig.user,
    password: process.env.DB_PASSWORD,
    database: poolConfig.database,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    queueLimit: 0,
    connectTimeout: 15000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });
  return pool;
}

function getConfig() {
  getPool();
  return poolConfig;
}

module.exports = new Proxy({}, {
  get(_, prop) {
    if (prop === '__getConfig') return getConfig;
    return getPool()[prop];
  }
});
