import { neon } from '@neondatabase/serverless'
import { createHash } from 'node:crypto'
import { checkOrigin, onlyMethod, sendJson } from '../_lib/http.js'

function readPassToken(req) {
  let body = req.body

  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      return null
    }
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null
  }

  const token = body.passToken
  return typeof token === 'string' &&
    token.length >= 32 &&
    token.length <= 200
    ? token
    : null
}

export default async function handler(req, res) {
  if (!onlyMethod(req, res, 'POST')) return
  if (!checkOrigin(req, res)) return

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    return sendJson(res, 503, {
      error: 'Pass status service is not configured.'
    })
  }

  const passToken = readPassToken(req)
  if (!passToken) {
    return sendJson(res, 400, {
      error: 'A valid pass token is required.'
    })
  }

  const tokenHash = createHash('sha256')
    .update(passToken)
    .digest('hex')

  try {
    const sql = neon(databaseUrl)
    const rows = await sql`
      SELECT
        verified_paid,
        payment_mode,
        approved_at,
        declined_at,
        expires_at,
        (
          verified_paid = TRUE
          AND payment_mode = 'test'
          AND approved_at IS NOT NULL
          AND declined_at IS NULL
          AND expires_at > NOW()
        ) AS active
      FROM vellon_pass_orders
      WHERE pass_token_hash = ${tokenHash}
      LIMIT 1
    `

    const order = rows[0]

    if (!order) {
      return sendJson(res, 200, {
        active: false,
        state: 'unavailable'
      })
    }

    if (order.declined_at) {
      return sendJson(res, 200, {
        active: false,
        state: 'declined'
      })
    }

    if (order.active) {
      return sendJson(res, 200, {
        active: true,
        state: 'active',
        expiresAt: order.expires_at
      })
    }

    if (
      order.verified_paid &&
      order.payment_mode === 'test' &&
      order.approved_at &&
      order.expires_at
    ) {
      return sendJson(res, 200, {
        active: false,
        state: 'expired'
      })
    }

    if (order.verified_paid && order.payment_mode === 'test') {
      return sendJson(res, 200, {
        active: false,
        state: 'awaiting_admin_approval'
      })
    }

    return sendJson(res, 200, {
      active: false,
      state: 'payment_pending'
    })
  } catch {
    return sendJson(res, 500, {
      error: 'Unable to check pass status.'
    })
  }
}
