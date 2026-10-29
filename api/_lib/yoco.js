import {
  createHmac,
  randomBytes,
  timingSafeEqual
} from 'node:crypto'

export const PASS_AMOUNT_CENTS = 2999
export const PASS_CURRENCY = 'ZAR'

export function makePassToken() {
  return randomBytes(32).toString('base64url')
}

export function verifyYocoSignature({ id, timestamp, signature, rawBody, secret }) {
  if (!id || !timestamp || !signature || !rawBody || !secret) return false

  // Yoco webhook secrets use the whsec_ prefix followed by base64 secret data.
  if (!secret.startsWith('whsec_')) return false

  const timestampNumber = Number(timestamp)
  if (!Number.isFinite(timestampNumber)) return false

  // Reject stale or future-dated deliveries to reduce replay risk.
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestampNumber) > 180) return false

  let key
  try {
    key = Buffer.from(secret.slice('whsec_'.length), 'base64')
  } catch {
    return false
  }
  if (!key.length) return false

  const signedContent = `${id}.${timestamp}.${rawBody.toString('utf8')}`
  const expected = createHmac('sha256', key)
    .update(signedContent)
    .digest()

  // Yoco may send more than one versioned signature.
  const candidates = String(signature)
    .split(/\s+/)
    .flatMap(part => {
      const match = /^v1,([A-Za-z0-9+/=_-]+)$/.exec(part)
      return match ? [match[1]] : []
    })

  return candidates.some(candidate => {
    try {
      const supplied = Buffer.from(candidate, 'base64')
      return supplied.length === expected.length &&
        timingSafeEqual(supplied, expected)
    } catch {
      return false
    }
  })
}
