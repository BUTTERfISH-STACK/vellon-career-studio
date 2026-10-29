import { checkOrigin, onlyMethod, sendJson } from './http.js'

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function start(req, res) {
  if (!onlyMethod(req, res, 'POST')) return false

  // Enforce an explicit same-origin browser request in production.
  // This is a safeguard, not proof that a request is from a genuine person.
  if (process.env.NODE_ENV === 'production') {
    if (!req.headers.origin) {
      sendJson(res, 403, { error: 'Origin header required.' })
      return false
    }
    if (!checkOrigin(req, res)) return false
  }

  return true
}

export function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  return {}
}

export function validId(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

export function database() {
  if (!process.env.DATABASE_URL) return null
  return true
}

export function unavailable(res) {
  sendJson(res, 503, { error: 'Referral service is not configured.' })
}
