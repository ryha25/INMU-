const crypto = require('crypto')
const { Pool } = require('pg')

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

function decodeToken(token) {
  const secret = process.env.PORTAL_LINK_SECRET
  if (!secret) throw new Error('PORTAL_LINK_SECRET is not configured')
  const [encoded, signature] = String(token || '').split('.')
  if (!encoded || !signature) throw new Error('Invalid link token')
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url')
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('Invalid link signature')
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
  if (!payload.portalUserId || !payload.exp || Date.now() >= Number(payload.exp) * 1000) throw new Error('Expired or incomplete link token')
  return payload
}

async function handlePortalLink(req, res, url) {
  if (req.method !== 'GET' || url.pathname !== '/api/portal/link') return false
  if (!pool) { json(res, 503, { error: 'Database is not configured' }); return true }
  try {
    const payload = decodeToken(url.searchParams.get('token'))
    const result = await pool.query(
      `insert into inmu_game_users (portal_user_id, username, linked_at, updated_at)
       values ($1, $2, now(), now())
       on conflict (portal_user_id) do update set username = excluded.username, updated_at = now()
       returning id, portal_user_id, username, linked_at`,
      [String(payload.portalUserId), String(payload.username || 'PORTALユーザー').slice(0, 80)]
    )
    json(res, 200, { linked: true, user: result.rows[0] })
  } catch (error) {
    json(res, 401, { linked: false, error: error.message })
  }
  return true
}

module.exports = { handlePortalLink }
