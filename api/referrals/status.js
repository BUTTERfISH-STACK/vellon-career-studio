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

    // Create one reward for each five distinct qualifying browser IDs.
    await sql`
      INSERT INTO vellon_referral_rewards (owner_id, milestone)
      SELECT ${ownerId}::uuid, n * 5
      FROM generate_series(
        1,
        (
          SELECT COUNT(*)::integer / 5
          FROM vellon_referral_exports
          WHERE referrer_id = ${ownerId}::uuid
        )
      ) AS n
      ON CONFLICT (owner_id, milestone) DO NOTHING
    `

    const [counts] = await sql`
      SELECT
        (SELECT COUNT(*)::integer
         FROM vellon_referral_visits
         WHERE referrer_id = ${ownerId}::uuid) AS visits,
        (SELECT COUNT(*)::integer
         FROM vellon_referral_exports
         WHERE referrer_id = ${ownerId}::uuid) AS qualified,
        (SELECT COUNT(*)::integer
         FROM vellon_referral_rewards
         WHERE owner_id = ${ownerId}::uuid
           AND status = 'available') AS available,
        (SELECT COUNT(*)::integer
         FROM vellon_referral_rewards
         WHERE owner_id = ${ownerId}::uuid
           AND status = 'reserved') AS reserved,
        (SELECT COUNT(*)::integer
         FROM vellon_referral_rewards
         WHERE owner_id = ${ownerId}::uuid
           AND status = 'redeemed') AS redeemed
    `

    return sendJson(res, 200, counts)
  } catch {
    return sendJson(res, 500, { error: 'Could not load referral progress.' })
  }
}
