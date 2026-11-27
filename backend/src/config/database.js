if (!process.env.VERCEL) require('dotenv').config();

if (require('../database/driver').driver() === 'postgres') {
    const {Pool}=require('pg');
    const {config}=require('../database/postgres');
    const pool=new Pool({...config(),options:'-c timezone=America/Fortaleza'});
    pool.on('error',()=>console.error('PostgreSQL: conexão ociosa indisponível.'));
    module.exports=require('../database/postgres-backend').createBackend(pool);
    if(process.env.VERCEL)require('@vercel/functions').attachDatabasePool(pool);
} else {
const mysql = require('mysql2/promise');

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
}
