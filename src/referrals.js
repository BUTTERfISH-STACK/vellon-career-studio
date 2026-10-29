const VISITOR_KEY = 'vellon_referral_visitor_v1'
const OWNER_KEY = 'vellon_referral_owner_v1'
const ATTRIBUTION_KEY = 'vellon_referral_attribution_v1'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 3 | 8)).toString(16)
  })
}

function getId(key) {
  let value = localStorage.getItem(key)
  if (!value) {
    value = makeId()
    localStorage.setItem(key, value)
  }
  return value
}

export function getReferralVisitorId() {
  return getId(VISITOR_KEY)
}

export function getReferralOwnerId() {
  return getId(OWNER_KEY)
}

export function getReferralAttribution() {
  return localStorage.getItem(ATTRIBUTION_KEY) || ''
}

async function post(path, data) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Referral request failed.')
  return result
}

export function initializeReferralTracking() {
  if (typeof window === 'undefined') return
  try {
    const visitorId = getReferralVisitorId()
    const incoming = new URLSearchParams(window.location.search).get('ref')
    const ownerId = getReferralOwnerId()
    const saved = getReferralAttribution()

    // First-touch attribution is retained; a self-referral is ignored.
    if (!saved && incoming && UUID_RE.test(incoming) && incoming !== visitorId && incoming !== ownerId) {
      localStorage.setItem(ATTRIBUTION_KEY, incoming)
    }

    const referrerId = getReferralAttribution()
    if (referrerId && referrerId !== visitorId && referrerId !== ownerId) {
      void post('/api/referrals/visit', { visitorId, referrerId }).catch(() => {})
    }
  } catch {
    // The free CV builder must continue working if storage or the API is unavailable.
  }
}

export function trackStandardExport() {
  try {
    const visitorId = getReferralVisitorId()
    const eventId = makeId()
    void post('/api/referrals/qualify', { visitorId, eventId }).catch(() => {})
  } catch {
    // Referral analytics are best-effort and never block free exports.
  }
}

export async function referralRequest(path, data) {
  return post(path, data)
}
