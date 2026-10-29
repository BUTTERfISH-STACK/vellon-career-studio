import { neon } from '@neondatabase/serverless'
import { sendJson } from '../_lib/http.js'
import { bodyOf, database, start, unavailable, validId } from '../_lib/referrals.js'

export default async function handler(req, res) {
  if (!start(req, res)) return
  const { visitorId, eventId } = bodyOf(req)

  if (!validId(visitorId) || !validId(eventId)) {
    return sendJson(res, 400, { error: 'Invalid export event.' })
  }
  if (!database()) return unavailable(res)

  try {
    const sql = neon(process.env.DATABASE_URL)
    const rows = await sql`
      INSERT INTO vellon_referral_exports (visitor_id, referrer_id, event_id)
      SELECT v.visitor_id, v.referrer_id, ${eventId}::uuid
      FROM vellon_referral_visits v
      WHERE v.visitor_id = ${visitorId}::uuid
      ON CONFLICT (visitor_id) DO NOTHING
      RETURNING visitor_id
    `
    return sendJson(res, 200, {
      recorded: rows.length > 0,
      event: 'standard_export_generated'
    })
  } catch {
    return sendJson(res, 500, { error: 'Could not record the export event.' })
  }
}
