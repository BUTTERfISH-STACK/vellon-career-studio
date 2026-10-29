import { neon } from '@neondatabase/serverless'
import { createHash } from 'node:crypto'
import { readRawBody, sendJson } from '../_lib/http.js'
import { verifyYocoSignature } from '../_lib/yoco.js'

// Preserve the original bytes for signature verification.
export const config = {
  api: {
    bodyParser: false
  }
}

function getHeader(req, name) {
  const value = req.headers[name]
  return Array.isArray(value) ? value[0] : value
}

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function isCheckoutId(value) {
  return typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= 200
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const secret = process.env.YOCO_WEBHOOK_SECRET
  const databaseUrl = process.env.DATABASE_URL

  // This release remains test-mode only.
  const expectedMode = 'test'

  if (!secret || !databaseUrl) {
    return sendJson(res, 503, {
      error: 'Webhook service is not configured.'
    })
  }

  let rawBody
  try {
    rawBody = await readRawBody(req)
  } catch (error) {
    return sendJson(res, error.statusCode || 400, {
      error: 'Unable to read the original webhook body.'
    })
  }

  const webhookId = getHeader(req, 'webhook-id')
  const timestamp = getHeader(req, 'webhook-timestamp')
  const signature = getHeader(req, 'webhook-signature')

  if (
    typeof webhookId !== 'string' ||
    webhookId.length < 1 ||
    webhookId.length > 255 ||
    !verifyYocoSignature({
      id: webhookId,
      timestamp,
      signature,
      rawBody,
      secret
    })
  ) {
    return sendJson(res, 401, {
      error: 'Invalid webhook signature or delivery identifier.'
    })
  }

  let event
  try {
    event = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON payload.' })
  }

  if (
    !event ||
    typeof event !== 'object' ||
    Array.isArray(event) ||
    typeof event.type !== 'string'
  ) {
    return sendJson(res, 400, { error: 'Incomplete webhook event.' })
  }

  if (
    event.type !== 'payment.succeeded' &&
    event.type !== 'payment.failed'
  ) {
    return sendJson(res, 200, { received: true, ignored: true })
  }

  const payload = event.payload ?? event.data

  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    return sendJson(res, 400, { error: 'Invalid payment payload.' })
  }

  const metadata = payload.metadata
  const orderId = metadata?.orderId
  const metadataCheckoutId = metadata?.checkoutId
  const directCheckoutId = payload.checkoutId

  // The checkout ID is the primary correlation key. orderId is our own
  // metadata field and, when supplied, must be a valid UUID and must match.
  if (orderId !== undefined && !isUuid(orderId)) {
    return sendJson(res, 400, {
      error: 'Payment notification has an invalid order ID.'
    })
  }

  if (
    (metadataCheckoutId !== undefined &&
      !isCheckoutId(metadataCheckoutId)) ||
    (directCheckoutId !== undefined &&
      !isCheckoutId(directCheckoutId)) ||
    (
      metadataCheckoutId !== undefined &&
      directCheckoutId !== undefined &&
      metadataCheckoutId !== directCheckoutId
    )
  ) {
    return sendJson(res, 400, {
      error: 'Invalid or conflicting checkout identifiers.'
    })
  }

  const checkoutId = metadataCheckoutId ?? directCheckoutId

  if (!isCheckoutId(checkoutId)) {
    return sendJson(res, 400, {
      error: 'Payment notification has no valid checkout identifier.'
    })
  }

  const amount = payload.amount
  const currency = String(payload.currency ?? '').toUpperCase()
  const mode = String(payload.mode ?? '').toLowerCase()
  const status = String(payload.status ?? '').toLowerCase()

  const expectedStatus =
    event.type === 'payment.succeeded' ? 'succeeded' : 'failed'

  // Reject malformed or mismatched payments without changing the order.
  const validPayment =
    Number.isSafeInteger(amount) &&
    amount === 2999 &&
    currency === 'ZAR' &&
    mode === expectedMode &&
    status === expectedStatus

  if (!validPayment) {
    return sendJson(res, 200, {
      received: true,
      verified: false
    })
  }

  const payloadHash = createHash('sha256')
    .update(rawBody)
    .digest('hex')

  const isSuccess = event.type === 'payment.succeeded'
  const sql = neon(databaseUrl)

  try {
    const result = await sql`
      WITH matched_order AS MATERIALIZED (
        SELECT
          id,
          amount_cents,
          currency
        FROM vellon_pass_orders
        WHERE checkout_id = ${checkoutId}
          AND (
            ${orderId ?? null}::uuid IS NULL
            OR id = ${orderId ?? null}::uuid
          )
          AND amount_cents = 2999
          AND currency = 'ZAR'
        LIMIT 1
      ),
      claimed_event AS (
        INSERT INTO vellon_pass_webhook_events
          (event_id, event_type, payload_sha256)
        SELECT
          ${webhookId},
          ${event.type},
          ${payloadHash}
        FROM matched_order
        ON CONFLICT (event_id) DO NOTHING
        RETURNING event_id
      ),
      updated_order AS (
        UPDATE vellon_pass_orders AS orders
        SET
          checkout_status = CASE
            WHEN ${isSuccess}
              THEN 'payment_verified_pending_admin'
            ELSE 'payment_failed'
          END,
          verified_paid = CASE
            WHEN ${isSuccess} THEN TRUE
            ELSE orders.verified_paid
          END,
          payment_mode = CASE
            WHEN ${isSuccess} THEN 'test'
            ELSE orders.payment_mode
          END,
          paid_at = CASE
            WHEN ${isSuccess} THEN COALESCE(orders.paid_at, NOW())
            ELSE orders.paid_at
          END,
          last_webhook_event_id = ${webhookId},
          updated_at = NOW()
        FROM matched_order, claimed_event
        WHERE orders.id = matched_order.id
          AND orders.verified_paid = FALSE
          AND orders.approved_at IS NULL
          AND orders.declined_at IS NULL
        RETURNING orders.id
      )
      SELECT
        EXISTS (SELECT 1 FROM matched_order) AS matched,
        EXISTS (SELECT 1 FROM claimed_event) AS claimed,
        EXISTS (SELECT 1 FROM updated_order) AS updated
    `

    const outcome = result[0]

    if (!outcome?.matched) {
      // Allow provider retries if the order cannot yet be reconciled.
      return sendJson(res, 500, {
        error: 'Order and checkout could not be matched. Retry delivery.'
      })
    }

    if (!outcome.claimed) {
      // A reused delivery ID must contain exactly the same signed body.
      const existing = await sql`
        SELECT payload_sha256
        FROM vellon_pass_webhook_events
        WHERE event_id = ${webhookId}
        LIMIT 1
      `

      if (!existing.length) {
        return sendJson(res, 500, {
          error: 'Unable to reconcile webhook delivery. Retry delivery.'
        })
      }

      if (existing[0].payload_sha256 !== payloadHash) {
        return sendJson(res, 409, {
          error: 'Webhook delivery ID was reused with different contents.'
        })
      }

      return sendJson(res, 200, {
        received: true,
        duplicate: true
      })
    }

    return sendJson(res, 200, {
      received: true,
      updated: Boolean(outcome.updated)
    })
  } catch {
    return sendJson(res, 500, {
      error: 'Webhook processing failed. Retry delivery.'
    })
  }
}
