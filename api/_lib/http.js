import { createHash, timingSafeEqual } from 'node:crypto'

export function sendJson(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

export function onlyMethod(req, res, method) {
  if (req.method === method) return true
  res.setHeader('Allow', method)
  sendJson(res, 405, { error: 'Method not allowed.' })
  return false
}

export function checkOrigin(req, res) {
  const configured = process.env.APP_BASE_URL
  const origin = req.headers.origin

  if (!configured) {
    sendJson(res, 503, { error: 'Server configuration is incomplete.' })
    return false
  }

  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(configured).origin) {
        sendJson(res, 403, { error: 'Origin not permitted.' })
        return false
      }
    } catch {
      sendJson(res, 503, { error: 'Server configuration is invalid.' })
      return false
    }
  }

  return true
}

export async function readRawBody(req, limit = 1024 * 1024) {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody
  if (typeof req.rawBody === 'string') return Buffer.from(req.rawBody)

  // Never verify a webhook against JSON that has already been re-serialized.
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) return req.body
    if (typeof req.body === 'string') return Buffer.from(req.body)
    throw new Error('Raw request body is unavailable.')
  }

  const chunks = []
  let size = 0

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length

    if (size > limit) {
      const error = new Error('Request body too large.')
      error.statusCode = 413
      throw error
    }

    chunks.push(buffer)
  }

  return Buffer.concat(chunks)
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function safeEqualText(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))

  return left.length === right.length && timingSafeEqual(left, right)
}
