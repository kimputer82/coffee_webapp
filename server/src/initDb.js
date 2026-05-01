const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
const fs = require('fs')
const { query, pool } = require('./db')

async function initDb() {
  console.log('Using password:', process.env.PGPASSWORD)
  try {
    const schema = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8')
    console.log('Initializing database...')
    
    // We need to execute the schema. Since it contains multiple statements, 
    // we can either split them or use the pool.query directly if the driver supports it.
    // pg driver supports multiple statements in one query call.
    await query(schema)
    
    console.log('Database initialized successfully.')
  } catch (error) {
    console.error('Failed to initialize database:', error)
  } finally {
    await pool.end()
  }
}

initDb()
