import { neon } from '@neondatabase/serverless'
import { randomUUID, createHash } from 'node:crypto'
import { checkOrigin, onlyMethod, sendJson } from '../_lib/http.js'
import {
  PASS_AMOUNT_CENTS,
  PASS_CURRENCY,
  makePassToken
} from '../_lib/yoco.js'

export default async function handler(req, res) {
  if (!onlyMethod(req, res, 'POST')) return
  if (!checkOrigin(req, res)) return

  const databaseUrl = process.env.DATABASE_URL
  const yocoKey = process.env.YOCO_SECRET_KEY
  const baseUrl = process.env.APP_BASE_URL

  if (!databaseUrl || !yocoKey || !baseUrl) {
    return sendJson(res, 503, {
      error: 'Payment service is not configured yet.'
    })
  }

  // This initial release must never create live checkouts.
  if (!yocoKey.startsWith('sk_test_')) {
    return sendJson(res, 503, {
      error: 'Test-mode Yoco credentials are required.'
    })
  }

  const sql = neon(databaseUrl)
  const orderId = randomUUID()
  const passToken = makePassToken()
  const tokenHash = createHash('sha256').update(passToken).digest('hex')

  try {
    await sql`
      INSERT INTO vellon_pass_orders
        (id, amount_cents, currency, pass_token_hash, checkout_status, payment_mode)
      VALUES
        (${orderId}::uuid, ${PASS_AMOUNT_CENTS}, ${PASS_CURRENCY},
         ${tokenHash}, 'creating_checkout', 'test')
    `

    const origin = new URL(baseUrl).origin
    const response = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${yocoKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: PASS_AMOUNT_CENTS,
        currency: PASS_CURRENCY,
        successUrl: `${origin}/?pass=return`,
        cancelUrl: `${origin}/?pass=cancelled`,
        failureUrl: `${origin}/?pass=failed`,
        clientReferenceId: orderId,
        metadata: {
          orderId,
          product: 'VELLON_PASS'
        }
      }),
      signal: AbortSignal.timeout(15000)
    })

    const checkout = await response.json().catch(() => ({}))

    if (!response.ok || !checkout.id || !checkout.redirectUrl) {
      await sql`
        UPDATE vellon_pass_orders
        SET checkout_status = 'checkout_creation_failed',
            updated_at = NOW()
        WHERE id = ${orderId}::uuid
      `
      return sendJson(res, 502, {
        error: 'Yoco could not create a test checkout. No payment was confirmed.'
      })
    }

    await sql`
      UPDATE vellon_pass_orders
      SET checkout_id = ${checkout.id},
          checkout_status = 'checkout_created',
          updated_at = NOW()
      WHERE id = ${orderId}::uuid
    `

    // The customer token is returned only once. The database stores its hash.
    return sendJson(res, 200, {
      checkoutUrl: checkout.redirectUrl,
      orderId,
      passToken
    })
  } catch {
    // Do not expose database details, credentials, or provider responses.
    return sendJson(res, 500, {
      error: 'Unable to start checkout. Check server configuration and logs.'
    })
  }
}
