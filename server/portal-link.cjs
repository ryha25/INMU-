const crypto = require('crypto')
const { Pool } = require('pg')

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null
const COOKIE_NAME = 'inmu_portal_session'
const CHALLENGE_RECOVERY_COST = 500
const CURRENT_PORTAL_URL = 'https://inmu-portal-core.replit.app'
const configuredPortalUrl = String(process.env.PORTAL_PUBLIC_URL || '').trim()
const PORTAL_PUBLIC_URL = !configuredPortalUrl
  ? CURRENT_PORTAL_URL
  : configuredPortalUrl.replace(/\/$/, '')
let schemaReady
let bugReportSchemaReady

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

function secret() {
  const value = String(process.env.PORTAL_LINK_SECRET || '').trim()
  if (!value) throw new Error('PORTAL_LINK_SECRET is not configured')
  return value
}

function isChallengeCompensationEligible(body, now = Date.now()) {
  const challengeSessionId = typeof body?.challengeSessionId === 'string'
    ? body.challengeSessionId.trim()
    : ''
  const details = body?.turnStallDetails
  if (
    body?.challengeActive !== true ||
    body?.turnStallDetected !== true ||
    !/^challenge-\d{10,16}-[a-zA-Z0-9-]{6,80}$/.test(challengeSessionId) ||
    !details ||
    typeof details !== 'object' ||
    details.sessionId !== challengeSessionId ||
    !Number.isInteger(details.playerIndex) ||
    details.playerIndex < 0 ||
    details.playerIndex > 3 ||
    !Number.isFinite(details.timeLimitSeconds) ||
    details.timeLimitSeconds < 1 ||
    details.timeLimitSeconds > 300
  ) return false

  const detectedAt = Date.parse(details.detectedAt)
  return Number.isFinite(detectedAt) && detectedAt <= now + 60_000 && detectedAt >= now - 30 * 60_000
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

function ensureBugReportSchema() {
  if (!pool) return Promise.reject(new Error('Database is not configured'))
  if (!bugReportSchemaReady) {
    bugReportSchemaReady = pool.query(`
      create table if not exists "bugReports" (
        id serial primary key,
        "userId" text not null,
        category text not null default 'bug',
        subject text not null,
        message text not null,
        "pageUrl" text,
        "userAgent" text,
        source text not null default 'portal',
        "challengeSessionId" text,
        "challengeCompensated" boolean not null default false,
        status text not null default 'open',
        "adminReply" text,
        "repliedAt" timestamptz,
        "createdAt" timestamptz not null default now(),
        "updatedAt" timestamptz not null default now()
      );
      alter table "bugReports" add column if not exists source text not null default 'portal';
      alter table "bugReports" add column if not exists "challengeSessionId" text;
      alter table "bugReports" add column if not exists "challengeCompensated" boolean not null default false;
      create index if not exists "bugReports_status_created_idx"
        on "bugReports" (status, "createdAt" desc);
      create index if not exists "bugReports_user_created_idx"
        on "bugReports" ("userId", "createdAt" desc);
      create unique index if not exists "bugReports_challenge_compensation_idx"
        on "bugReports" ("userId", "challengeSessionId")
        where "challengeSessionId" is not null;
    `).catch(error => {
      bugReportSchemaReady = null
      throw error
    })
  }
  return bugReportSchemaReady
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
      if (!['play', 'win', 'challenge_play', 'challenge_win'].includes(body.eventType)) throw new Error('Invalid eventType')
      const response = await fetch(`${PORTAL_PUBLIC_URL}/api/game-events/daifugo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: createFreshPortalToken(session), eventType: body.eventType, roomId: String(body.roomId || ''), ...(body.challengeLevel != null ? { challengeLevel: Number(body.challengeLevel) } : {}) }),
      })
      const result = await response.json().catch(() => ({}))
      json(res, response.status, result)
    } catch (error) {
      json(res, 401, { ok: false, error: error.message })
    }
    return true
  }
  if (req.method === 'POST' && url.pathname === '/api/portal/challenge-recovery') {
    if (!pool) { json(res, 503, { ok: false, error: 'Database is not configured' }); return true }
    let client
    try {
      const session = getPortalSession(req)
      client = await pool.connect()
      await client.query('BEGIN')
      const profile = await client.query(
        `select "monthlyPoints" from "profile" where "userId" = $1 for update`,
        [session.portalUserId]
      )
      if (profile.rows.length === 0) {
        await client.query('ROLLBACK')
        json(res, 404, { ok: false, error: 'profile not found' })
        return true
      }
      const currentBalance = Number(profile.rows[0].monthlyPoints || 0)
      if (currentBalance < CHALLENGE_RECOVERY_COST) {
        await client.query('ROLLBACK')
        json(res, 400, { ok: false, error: 'insufficient_points' })
        return true
      }
      const remainingBalance = currentBalance - CHALLENGE_RECOVERY_COST
      const now = new Date()
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      await client.query(
        `update "profile" set "monthlyPoints" = "monthlyPoints" - $2, "updatedAt" = now() where "userId" = $1`,
        [session.portalUserId, CHALLENGE_RECOVERY_COST]
      )
      await client.query(
        `insert into "points" ("userId", amount, type, source, month) values ($1, $2, $3, $4, $5)`,
        [session.portalUserId, String(-CHALLENGE_RECOVERY_COST), 'challenge_recovery', 'INMU Daifugo challenge recovery', month]
      )
      await client.query('COMMIT')
      json(res, 200, { ok: true, remainingBalance })
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => undefined)
      json(res, 401, { ok: false, error: error.message || 'unauthorized' })
    } finally {
      if (client) client.release()
    }
    return true
  }
  if (req.method === 'POST' && url.pathname === '/api/portal/bug-report') {
    if (!pool) { json(res, 503, { ok: false, error: 'Database is not configured' }); return true }
    let client
    try {
      const session = getPortalSession(req)
      let raw = ''
      for await (const chunk of req) {
        raw += chunk
        if (raw.length > 10000) throw new Error('Body too large')
      }
      const body = JSON.parse(raw || '{}')
      const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
      const message = typeof body.message === 'string' ? body.message.trim() : ''
      const pageUrl = typeof body.pageUrl === 'string' ? body.pageUrl.trim().slice(0, 500) : null
      const challengeSessionId = typeof body.challengeSessionId === 'string'
        ? body.challengeSessionId.trim().slice(0, 120)
        : ''
      const stallDetails = body.turnStallDetails && typeof body.turnStallDetails === 'object'
        ? body.turnStallDetails
        : null
      const compensationEligible = isChallengeCompensationEligible(body)
      if (!subject || subject.length > 100 || message.length < 5 || message.length > 2000) {
        json(res, 400, { ok: false, error: '件名は100文字以内、内容は5〜2000文字で入力してください' })
        return true
      }

      await ensureBugReportSchema()
      client = await pool.connect()
      await client.query('BEGIN')
      await client.query('select pg_advisory_xact_lock(hashtext($1))', [`${session.portalUserId}:${challengeSessionId || 'report'}`])
      const recent = await client.query(
        `select count(*)::int as count from "bugReports"
         where "userId" = $1 and "createdAt" > now() - interval '10 minutes'`,
        [session.portalUserId]
      )
      if (Number(recent.rows[0]?.count || 0) >= 5) {
        await client.query('ROLLBACK')
        json(res, 429, { ok: false, error: '短時間に送信できる報告数を超えました' })
        return true
      }

      let compensate = false
      let alreadyCompensated = false
      if (compensationEligible) {
        const existing = await client.query(
          `select 1 from "bugReports" where "userId" = $1 and "challengeSessionId" = $2 limit 1`,
          [session.portalUserId, challengeSessionId]
        )
        alreadyCompensated = existing.rows.length > 0
        compensate = !alreadyCompensated
      }
      const diagnostic = compensate && stallDetails
        ? `\n\n[自動検出] 手番タイムリミット超過後も進行なし / 手番: ${Number(stallDetails.playerIndex) + 1} / 制限: ${Number(stallDetails.timeLimitSeconds) || 0}秒 / 検出: ${String(stallDetails.detectedAt || '').slice(0, 40)}`
        : ''
      const inserted = await client.query(
        `insert into "bugReports"
          ("userId", category, subject, message, "pageUrl", "userAgent", source,
           "challengeSessionId", "challengeCompensated")
         values ($1, 'bug', $2, $3, $4, $5, 'daifugo', $6, $7)
         returning id, status, "createdAt", "challengeCompensated"`,
        [
          session.portalUserId,
          subject,
          `${message}${diagnostic}`,
          pageUrl,
          String(req.headers['user-agent'] || '').slice(0, 500) || null,
          compensate ? challengeSessionId : null,
          compensate,
        ]
      )
      await client.query('COMMIT')
      json(res, 201, {
        ok: true,
        ...inserted.rows[0],
        challengeCompensated: compensate || alreadyCompensated,
        challengeCompensationAlreadyApplied: alreadyCompensated,
      })
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => undefined)
      const unauthorized = /signature|token|expired|incomplete/i.test(String(error?.message || ''))
      json(res, unauthorized ? 401 : 500, { ok: false, error: unauthorized ? 'PORTAL連携ログインが必要です' : '不具合報告を送信できませんでした' })
    } finally {
      if (client) client.release()
    }
    return true
  }
  return false
}

module.exports = { handlePortalLink, getPortalSession, ensurePortalSchema, isChallengeCompensationEligible }
