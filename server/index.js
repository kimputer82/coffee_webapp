require('dotenv').config({ quiet: true })
const express = require('express')
const { checkDbConnection, pool } = require('./src/db')

const routes = require('./src/routes')

const app = express()
const PORT = process.env.PORT || 4000

app.use(express.json())

// Basic CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

// Register API routes
app.use('/api', routes)

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'cozy-server' })
})

app.get('/health/db', async (_req, res) => {
  try {
    await checkDbConnection()
    res.json({ ok: true, database: 'connected' })
  } catch (error) {
    res.status(500).json({
      ok: false,
      database: 'disconnected',
      message: error.message,
    })
  }
})

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server listening at http://127.0.0.1:${PORT}`)
})

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down...`)
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
