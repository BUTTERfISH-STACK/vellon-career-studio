import { neon } from '@neondatabase/serverless'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL is missing. No database changes were made.')
  process.exit(1)
}

const sql = neon(databaseUrl)

await sql`
  CREATE TABLE IF NOT EXISTS vellon_pass_orders (
    id UUID PRIMARY KEY,
    amount_cents INTEGER NOT NULL CHECK (amount_cents = 2999),
    currency TEXT NOT NULL CHECK (currency = 'ZAR'),
    pass_token_hash TEXT NOT NULL UNIQUE,
    checkout_id TEXT UNIQUE,
    checkout_status TEXT NOT NULL DEFAULT 'creating_checkout',
    verified_paid BOOLEAN NOT NULL DEFAULT FALSE,
    payment_mode TEXT NOT NULL DEFAULT 'test',
    last_webhook_event_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
  )
`

await sql`
  CREATE INDEX IF NOT EXISTS vellon_pass_orders_pending_idx
  ON vellon_pass_orders (created_at DESC)
  WHERE verified_paid = TRUE
    AND approved_at IS NULL
    AND declined_at IS NULL
`

await sql`
  CREATE INDEX IF NOT EXISTS vellon_pass_orders_expiry_idx
  ON vellon_pass_orders (expires_at)
  WHERE expires_at IS NOT NULL
`

await sql`
  CREATE TABLE IF NOT EXISTS vellon_pass_webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload_sha256 TEXT NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`

await sql`
  CREATE TABLE IF NOT EXISTS vellon_pass_admin_audit (
    id BIGSERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    order_id UUID,
    actor TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`

console.log('VÉLLON PASS database migration completed.')
console.log('Created/verified tables: orders, webhook events, admin audit.')
console.log('No payment was taken. No customer access was approved.')
