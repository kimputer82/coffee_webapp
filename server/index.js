require('dotenv').config({ quiet: true })
const express = require('express')
const { checkDbConnection, pool } = require('./src/db')

const app = express()
const PORT = process.env.PORT || 4000

app.use(express.json())

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

const server = app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`)
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
