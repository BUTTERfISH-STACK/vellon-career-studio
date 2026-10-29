import { neon } from '@neondatabase/serverless'
import { sendJson } from '../_lib/http.js'
import { bodyOf, database, start, unavailable, validId } from '../_lib/referrals.js'

export default async function handler(req, res) {
  if (!start(req, res)) return
  const { ownerId, rewardId, reservationToken } = bodyOf(req)

  if (![ownerId, rewardId, reservationToken].every(validId)) {
    return sendJson(res, 400, { error: 'Invalid reward redemption request.' })
  }
  if (!database()) return unavailable(res)

  try {
    const sql = neon(process.env.DATABASE_URL)
    const rows = await sql`
      UPDATE vellon_referral_rewards
      SET status = 'redeemed',
          redeemed_at = COALESCE(redeemed_at, NOW()),
          reserved_until = NULL
      WHERE id = ${rewardId}::uuid
        AND owner_id = ${ownerId}::uuid
        AND reservation_token = ${reservationToken}::uuid
        AND (
          (status = 'reserved' AND reserved_until > NOW())
          OR status = 'redeemed'
        )
      RETURNING id
    `
    if (!rows.length) {
      return sendJson(res, 409, { error: 'Reward reservation expired or is no longer valid.' })
    }
    return sendJson(res, 200, { redeemed: true })
  } catch {
    return sendJson(res, 500, { error: 'Could not confirm reward redemption.' })
  }
}
