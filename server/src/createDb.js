const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function createDb() {
  const client = new Client({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: 'postgres' // Connect to default DB
  });

  try {
    await client.connect();
    console.log('Connected to postgres database.');
    
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'cozy'");
    if (res.rowCount === 0) {
      console.log('Creating database cozy...');
      await client.query('CREATE DATABASE cozy');
      console.log('Database cozy created.');
    } else {
      console.log('Database cozy already exists.');
    }
  } catch (error) {
    console.error('Failed to create database:', error);
  } finally {
    await client.end();
  }
}

createDb();
