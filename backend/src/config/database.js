const mysql = require('mysql2/promise');
if (!process.env.VERCEL) require('dotenv').config();

const connection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ...(process.env.DB_SSL === 'true'
        ? {
              ssl: {
                  rejectUnauthorized: true,
                  ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA } : {})
              }
          }
        : {}),

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = connection;
if (process.env.VERCEL) {
    require('@vercel/functions').attachDatabasePool(connection.pool);
}
