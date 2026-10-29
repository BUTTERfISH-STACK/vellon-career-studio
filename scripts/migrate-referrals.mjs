import { neon } from '@neondatabase/serverless'

if (process.env.NEON_BRANCH !== 'vellon-pass-test') {
  console.error('Refusing migration: NEON_BRANCH must equal vellon-pass-test.')
  process.exit(1)
}

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Database URL missing. No changes made.')
  process.exit(1)
}

const sql = neon(databaseUrl)

await sql`
  CREATE TABLE IF NOT EXISTS vellon_referral_visits (
    visitor_id UUID PRIMARY KEY,
    referrer_id UUID NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (visitor_id <> referrer_id)
  )
`

await sql`
  CREATE INDEX IF NOT EXISTS vellon_referral_visits_referrer_idx
  ON vellon_referral_visits (referrer_id)
`

await sql`
  CREATE TABLE IF NOT EXISTS vellon_referral_exports (
    visitor_id UUID PRIMARY KEY,
    referrer_id UUID NOT NULL,
    event_id UUID NOT NULL UNIQUE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (visitor_id <> referrer_id)
  )
`

await sql`
  CREATE INDEX IF NOT EXISTS vellon_referral_exports_referrer_idx
  ON vellon_referral_exports (referrer_id)
`

await sql`
  CREATE TABLE IF NOT EXISTS vellon_referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    milestone INTEGER NOT NULL CHECK (milestone > 0 AND milestone % 5 = 0),
    status TEXT NOT NULL DEFAULT 'available'
      CHECK (status IN ('available', 'reserved', 'redeemed')),
    reservation_token UUID,
    reserved_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    redeemed_at TIMESTAMPTZ,
    UNIQUE (owner_id, milestone)
  )
`

await sql`
  CREATE INDEX IF NOT EXISTS vellon_referral_rewards_owner_status_idx
  ON vellon_referral_rewards (owner_id, status)
`

console.log('Referral tables created/verified on the test branch.')
console.log('No payment or production database was touched.')
