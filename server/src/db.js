const { Pool } = require('pg')

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL)

const pool = new Pool(
  hasDatabaseUrl
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl:
          process.env.PGSSL === 'true'
            ? { rejectUnauthorized: false }
            : undefined,
      }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE || 'cozy',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        ssl:
          process.env.PGSSL === 'true'
            ? { rejectUnauthorized: false }
            : undefined,
      },
)

async function query(text, params = []) {
  return pool.query(text, params)
}

async function checkDbConnection() {
  await query('SELECT 1')
}

module.exports = {
  pool,
  query,
  checkDbConnection,
}
