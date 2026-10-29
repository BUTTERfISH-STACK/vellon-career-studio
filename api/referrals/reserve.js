import { randomUUID } from 'node:crypto'
import { neon } from '@neondatabase/serverless'
import { sendJson } from '../_lib/http.js'
import { bodyOf, database, start, unavailable, validId } from '../_lib/referrals.js'

export default async function handler(req, res) {
  if (!start(req, res)) return
  const { ownerId } = bodyOf(req)

  if (!validId(ownerId)) {
    return sendJson(res, 400, { error: 'Invalid referral profile.' })
  }
  if (!database()) return unavailable(res)

  try {
    const sql = neon(process.env.DATABASE_URL)
    const token = randomUUID()

    // Expire stale reservations in a separate statement so the next
    // statement can see rewards returned to the available state.
    await sql`
      UPDATE vellon_referral_rewards
      SET status = 'available',
          reservation_token = NULL,
          reserved_until = NULL
      WHERE owner_id = ${ownerId}::uuid
        AND status = 'reserved'
        AND reserved_until < NOW()
    `

    // Reserve one reward atomically. SKIP LOCKED prevents concurrent
    // requests from claiming the same available reward.
    const rows = await sql`
      UPDATE vellon_referral_rewards
      SET status = 'reserved',
          reservation_token = ${token}::uuid,
          reserved_until = NOW() + INTERVAL '10 minutes'
      WHERE id = (
        SELECT id
        FROM vellon_referral_rewards
        WHERE owner_id = ${ownerId}::uuid
          AND status = 'available'
        ORDER BY created_at, id
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id
    `

    if (!rows.length) {
      return sendJson(res, 409, { error: 'No available reward. Earn five qualifying referrals first.' })
    }

    return sendJson(res, 200, { rewardId: rows[0].id, reservationToken: token })
  } catch {
    return sendJson(res, 500, { error: 'Could not reserve a reward.' })
  }
}
