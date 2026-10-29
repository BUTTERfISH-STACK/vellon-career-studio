import { neon } from '@neondatabase/serverless'
import { sendJson } from '../_lib/http.js'
import { bodyOf, database, start, unavailable, validId } from '../_lib/referrals.js'

export default async function handler(req, res) {
  if (!start(req, res)) return
  const { ownerId, rewardId, reservationToken } = bodyOf(req)

  if (![ownerId, rewardId, reservationToken].every(validId)) {
    return sendJson(res, 400, { error: 'Invalid reward release request.' })
  }
  if (!database()) return unavailable(res)

  try {
    const sql = neon(process.env.DATABASE_URL)
    await sql`
      UPDATE vellon_referral_rewards
      SET status = 'available',
          reservation_token = NULL,
          reserved_until = NULL
      WHERE id = ${rewardId}::uuid
        AND owner_id = ${ownerId}::uuid
        AND reservation_token = ${reservationToken}::uuid
        AND status = 'reserved'
    `
    return sendJson(res, 200, { released: true })
  } catch {
    return sendJson(res, 500, { error: 'Could not release the reservation.' })
  }
}
