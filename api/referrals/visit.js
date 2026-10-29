import { neon } from '@neondatabase/serverless'
import { sendJson } from '../_lib/http.js'
import { bodyOf, database, start, unavailable, validId } from '../_lib/referrals.js'

export default async function handler(req, res) {
  if (!start(req, res)) return
  const { visitorId, referrerId } = bodyOf(req)

  if (!validId(visitorId) || !validId(referrerId)) {
    return sendJson(res, 400, { error: 'Invalid referral identifiers.' })
  }
  if (visitorId === referrerId) {
    return sendJson(res, 200, { recorded: false, reason: 'self_referral' })
  }
  if (!database()) return unavailable(res)

  try {
    const sql = neon(process.env.DATABASE_URL)
    const rows = await sql`
      INSERT INTO vellon_referral_visits (visitor_id, referrer_id)
      VALUES (${visitorId}::uuid, ${referrerId}::uuid)
      ON CONFLICT (visitor_id) DO NOTHING
      RETURNING visitor_id
    `
    return sendJson(res, 200, { recorded: rows.length > 0 })
  } catch {
    return sendJson(res, 500, { error: 'Could not record this referral visit.' })
  }
}
