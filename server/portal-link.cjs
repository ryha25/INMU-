const crypto = require('crypto')
const { Pool } = require('pg')

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null
const COOKIE_NAME = 'inmu_portal_session'
let schemaReady

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

function secret() {
  const value = String(process.env.PORTAL_LINK_SECRET || '').trim()
  if (!value) throw new Error('PORTAL_LINK_SECRET is not configured')
  return value
}

function ensurePortalSchema() {
  if (!pool) return Promise.reject(new Error('Database is not configured'))
  if (!schemaReady) schemaReady = pool.query(`
    create table if not exists inmu_game_users (
      id bigserial primary key,
      portal_user_id text not null unique,
      username varchar(80) not null,
      linked_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists inmu_game_results (
      id bigserial primary key,
      game_user_id bigint not null references inmu_game_users(id) on delete cascade,
      mode varchar(24) not null,
      finish_position smallint not null check (finish_position between 1 and 4),
      score integer not null default 0,
      played_at timestamptz not null default now()
    );

    create index if not exists inmu_game_results_user_played_idx
      on inmu_game_results (game_user_id, played_at desc);
  `)
  return schemaReady
}

function sign(encoded) {
  return crypto.createHmac('sha256', secret()).update(encoded).digest('base64url')
}

function safeEqual(actual, expected) {
  return actual.length === expected.length && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
}

function decodeSignedToken(token) {
  const [encoded, signature] = String(token || '').split('.')
  if (!encoded || !signature || !safeEqual(signature, sign(encoded))) throw new Error('Invalid link signature')
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
  if (!payload.portalUserId || !payload.exp || Date.now() >= Number(payload.exp) * 1000) throw new Error('Expired or incomplete link token')
  return payload
}

function createSession(user, portalToken) {
  const encoded = Buffer.from(JSON.stringify({
    portalUserId: user.portal_user_id,
    username: user.username,
    portalToken,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  }), 'utf8').toString('base64url')
  return `${encoded}.${sign(encoded)}`
}

function createFreshPortalToken(session) {
  const encoded = Buffer.from(JSON.stringify({
    portalUserId: session.portalUserId,
    username: session.username,
    exp: Math.floor(Date.now() / 1000) + 300,
  }), 'utf8').toString('base64url')
  return `${encoded}.${sign(encoded)}`
}

function cookieValue(req, name) {
  const cookies = String(req.headers.cookie || '').split(';')
  const item = cookies.map(value => value.trim()).find(value => value.startsWith(`${name}=`))
  return item ? decodeURIComponent(item.slice(name.length + 1)) : ''
}

function sessionCookie(token) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
}

function getPortalSession(req) {
  return decodeSignedToken(cookieValue(req, COOKIE_NAME))
}

async function link(req, res, token) {
  if (!pool) { json(res, 503, { linked: false, error: 'Database is not configured' }); return }
  try {
    const payload = decodeSignedToken(token)
    await ensurePortalSchema()
    const result = await pool.query(
      `insert into inmu_game_users (portal_user_id, username, linked_at, updated_at)
       values ($1, $2, now(), now())
       on conflict (portal_user_id) do update set username = excluded.username, updated_at = now()
       returning id, portal_user_id, username, linked_at`,
      [String(payload.portalUserId), String(payload.username || 'PORTALユーザー').slice(0, 80)]
    )
    res.writeHead(302, {
      Location: '/?portal=linked',
      'Set-Cookie': sessionCookie(createSession(result.rows[0], token)),
      'Cache-Control': 'no-store',
    })
    res.end()
  } catch (error) {
    res.writeHead(302, { Location: `/?portal=failed&reason=${encodeURIComponent(error.message)}`, 'Cache-Control': 'no-store' })
    res.end()
  }
}

async function handlePortalLink(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/' && url.searchParams.has('portalLink')) {
    await link(req, res, url.searchParams.get('portalLink'))
    return true
  }
  if (req.method === 'GET' && url.pathname === '/api/portal/link') {
    await link(req, res, url.searchParams.get('token'))
    return true
  }
  if (req.method === 'GET' && url.pathname === '/api/portal/session') {
    try {
      const session = getPortalSession(req)
      json(res, 200, { linked: true, user: { portalUserId: session.portalUserId, username: session.username } })
    } catch {
      json(res, 401, { linked: false })
    }
    return true
  }
  if (req.method === 'POST' && url.pathname === '/api/portal/logout') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      'Cache-Control': 'no-store',
    })
    res.end(JSON.stringify({ loggedOut: true }))
    return true
  }
  if (req.method === 'POST' && url.pathname === '/api/portal/game-event') {
    try {
      const session = getPortalSession(req)
      let raw = ''
      for await (const chunk of req) {
        raw += chunk
        if (raw.length > 10000) throw new Error('Body too large')
      }
      const body = JSON.parse(raw || '{}')
      if (!['play', 'win'].includes(body.eventType)) throw new Error('Invalid eventType')
      const response = await fetch('https://inmu-portal-core--kimanayakatamah.replit.app/api/game-events/daifugo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: createFreshPortalToken(session), eventType: body.eventType, roomId: String(body.roomId || '') }),
      })
      const result = await response.json().catch(() => ({}))
      json(res, response.status, result)
    } catch (error) {
      json(res, 401, { ok: false, error: error.message })
    }
    return true
  }
  return false
}

module.exports = { handlePortalLink, getPortalSession, ensurePortalSchema }
