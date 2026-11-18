import { createServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs'
import { resolve } from 'node:path'

const DATA_DIR = resolve('.vellon-data')
mkdirSync(DATA_DIR, { recursive: true })

const DB_PATH = resolve(DATA_DIR, 'reviews.sqlite')
const TOKEN_PATH = resolve(DATA_DIR, 'admin-token')

let adminToken = process.env.VELLON_ADMIN_TOKEN

if (!adminToken) {
  try {
    adminToken = readFileSync(TOKEN_PATH, 'utf8').trim()
  } catch {
    adminToken = randomBytes(32).toString('hex')
    writeFileSync(TOKEN_PATH, adminToken, { mode: 0o600 })
    try { chmodSync(TOKEN_PATH, 0o600) } catch {}
    console.log('\nNEW ADMIN TOKEN — SAVE THIS SECURELY:\n')
    console.log(adminToken)
    console.log('\nThe token is also stored privately in .vellon-data/admin-token\n')
  }
}

const db = new DatabaseSync(DB_PATH)

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_reviews_created
  ON reviews(created_at DESC);
`)

const insertReview = db.prepare(`
  INSERT INTO reviews (name, rating, message)
  VALUES (?, ?, ?)
`)

const getReviews = db.prepare(`
  SELECT id, name, rating, message, created_at AS date
  FROM reviews
  ORDER BY id DESC
  LIMIT 200
`)

const getStats = db.prepare(`
  SELECT COUNT(*) AS count, ROUND(AVG(rating), 1) AS average
  FROM reviews
`)

const deleteReview = db.prepare('DELETE FROM reviews WHERE id = ?')

const rateLimits = new Map()
const WINDOW_MS = 15 * 60 * 1000
const MAX_SUBMISSIONS = 5

function send(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  })
  res.end(JSON.stringify(payload))
}

async function readBody(req) {
  let body = ''
  for await (const chunk of req) {
    body += chunk
    if (body.length > 16384) throw new Error('Request too large')
  }
  return JSON.parse(body || '{}')
}

function authenticated(req) {
  const supplied = req.headers.authorization?.replace(/^Bearer\s+/i, '') || ''
  const a = Buffer.from(supplied)
  const b = Buffer.from(adminToken)
  return a.length === b.length && timingSafeEqual(a, b)
}

function allowedSubmission(req) {
  const ip = req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const record = rateLimits.get(ip)

  if (!record || now - record.start > WINDOW_MS) {
    rateLimits.set(ip, { start: now, count: 1 })
    return true
  }

  if (record.count >= MAX_SUBMISSIONS) return false
  record.count++
  return true
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1')
  const path = url.pathname

  try {
    if (req.method === 'GET' && path === '/api/health') {
      return send(res, 200, {
        status: 'ok',
        database: 'connected',
        service: 'vellon-reviews-api'
      })
    }

    if (req.method === 'GET' && path === '/api/reviews') {
      const reviews = getReviews.all()
      const stats = getStats.get()
      return send(res, 200, {
        reviews,
        count: stats.count,
        average: stats.average ?? 0
      })
    }

    if (req.method === 'POST' && path === '/api/reviews') {
      if (!allowedSubmission(req)) {
        return send(res, 429, { error: 'Too many submissions. Try again later.' })
      }

      const body = await readBody(req)
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      const message = typeof body.message === 'string' ? body.message.trim() : ''
      const rating = Number(body.rating)

      if (!name || name.length > 60) {
        return send(res, 400, { error: 'Name must contain 1–60 characters.' })
      }

      if (!message || message.length > 1000) {
        return send(res, 400, { error: 'Review must contain 1–1000 characters.' })
      }

      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return send(res, 400, { error: 'Rating must be between 1 and 5.' })
      }

      const result = insertReview.run(name, rating, message)
      const review = db.prepare(`
        SELECT id, name, rating, message, created_at AS date
        FROM reviews WHERE id = ?
      `).get(Number(result.lastInsertRowid))

      return send(res, 201, { review, message: 'Review published.' })
    }

    if (req.method === 'DELETE' && path.startsWith('/api/admin/reviews/')) {
      if (!authenticated(req)) {
        return send(res, 401, { error: 'Admin authentication required.' })
      }

      const id = Number(path.split('/').pop())
      if (!Number.isSafeInteger(id) || id < 1) {
        return send(res, 400, { error: 'Invalid review ID.' })
      }

      const result = deleteReview.run(id)
      if (Number(result.changes) === 0) {
        return send(res, 404, { error: 'Review not found.' })
      }

      return send(res, 200, { message: 'Review deleted.', id })
    }

    return send(res, 404, { error: 'Endpoint not found.' })
  } catch (error) {
    const status = error.message === 'Request too large' ? 413 : 400
    return send(res, status, { error: status === 413 ? error.message : 'Invalid request.' })
  }
})

const HOST = process.env.HOST || '127.0.0.1'
const PORT = Number(process.env.API_PORT || 8787)

server.listen(PORT, HOST, () => {
  console.log(`VÉLLON Reviews API running at http://${HOST}:${PORT}`)
  console.log(`Database: ${DB_PATH}`)
  console.log('Public review submissions: immediate publication')
  console.log('Admin deletion: authentication required')
})

function shutdown() {
  server.close(() => {
    db.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
