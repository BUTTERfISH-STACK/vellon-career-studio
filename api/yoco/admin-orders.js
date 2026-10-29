import { neon } from '@neondatabase/serverless'
import { safeEqualText, checkOrigin, sendJson } from '../_lib/http.js'

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function readBody(req) {
  let body = req.body

  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      return null
    }
  }

  return body && typeof body === 'object' && !Array.isArray(body)
    ? body
    : null
}

function isAuthorized(req, secret) {
  const header = req.headers.authorization
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return false
  }

  const supplied = header.slice(7)
  return supplied.length > 0 && safeEqualText(supplied, secret)
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  if (!checkOrigin(req, res)) return

  const adminToken = process.env.ADMIN_TOKEN
  const databaseUrl = process.env.DATABASE_URL

  if (
    !adminToken ||
    adminToken.length < 32 ||
    !databaseUrl
  ) {
    return sendJson(res, 503, {
      error: 'Admin service is not configured.'
    })
  }

  if (!isAuthorized(req, adminToken)) {
    return sendJson(res, 401, {
      error: 'Admin authorization required.'
    })
  }

  const sql = neon(databaseUrl)

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT
          id,
          amount_cents AS "amountCents",
          currency,
          created_at AS "createdAt",
          paid_at AS "paidAt"
        FROM vellon_pass_orders
        WHERE verified_paid = TRUE
          AND payment_mode = 'test'
          AND checkout_status = 'payment_verified_pending_admin'
          AND approved_at IS NULL
          AND declined_at IS NULL
        ORDER BY paid_at ASC NULLS LAST, created_at ASC
        LIMIT 100
      `

      return sendJson(res, 200, { orders: rows })
    }

    const body = readBody(req)
    const orderId = body?.orderId
    const action = body?.action

    if (!isUuid(orderId) || !['approve', 'decline'].includes(action)) {
      return sendJson(res, 400, {
        error: 'A valid order ID and approve/decline action are required.'
      })
    }

    let rows

    if (action === 'approve') {
      rows = await sql`
        WITH updated AS (
          UPDATE vellon_pass_orders
          SET
            approved_at = NOW(),
            expires_at = NOW() + INTERVAL '24 hours',
            checkout_status = 'approved_test',
            updated_at = NOW()
          WHERE id = ${orderId}::uuid
            AND verified_paid = TRUE
            AND payment_mode = 'test'
            AND checkout_status = 'payment_verified_pending_admin'
            AND approved_at IS NULL
            AND declined_at IS NULL
          RETURNING id, approved_at, expires_at
        ),
        audit AS (
          INSERT INTO vellon_pass_admin_audit
            (action, order_id, actor, details)
          SELECT
            'approve_test_pass',
            id,
            'admin',
            jsonb_build_object('expiresAt', expires_at)
          FROM updated
          RETURNING order_id
        )
        SELECT
          updated.id,
          updated.approved_at AS "approvedAt",
          updated.expires_at AS "expiresAt"
        FROM updated
        JOIN audit ON audit.order_id = updated.id
      `
    } else {
      rows = await sql`
        WITH updated AS (
          UPDATE vellon_pass_orders
          SET
            declined_at = NOW(),
            checkout_status = 'declined_by_admin',
            updated_at = NOW()
          WHERE id = ${orderId}::uuid
            AND verified_paid = TRUE
            AND payment_mode = 'test'
            AND checkout_status = 'payment_verified_pending_admin'
            AND approved_at IS NULL
            AND declined_at IS NULL
          RETURNING id, declined_at
        ),
        audit AS (
          INSERT INTO vellon_pass_admin_audit
            (action, order_id, actor, details)
          SELECT
            'decline_test_pass',
            id,
            'admin',
            '{}'::jsonb
          FROM updated
          RETURNING order_id
        )
        SELECT
          updated.id,
          updated.declined_at AS "declinedAt"
        FROM updated
        JOIN audit ON audit.order_id = updated.id
      `
    }

    if (!rows.length) {
      return sendJson(res, 409, {
        error: 'The order is not eligible for this action. Refresh the pending list.'
      })
    }

    return sendJson(res, 200, {
      success: true,
      action,
      order: rows[0]
    })
  } catch {
    return sendJson(res, 500, {
      error: 'Admin order operation failed.'
    })
  }
}
