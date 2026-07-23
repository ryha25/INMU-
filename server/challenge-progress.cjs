const { Pool } = require('pg')
const { ensurePortalSchema, getPortalSession } = require('./portal-link.cjs')

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null
let schemaReady

function ensureSchema() {
  if (!schemaReady) schemaReady = ensurePortalSchema().then(() => pool.query(`
    create table if not exists inmu_challenge_progress (
      game_user_id bigint primary key references inmu_game_users(id) on delete cascade,
      highest_cleared_level integer not null default 0 check (highest_cleared_level between 0 and 100),
      cleared_levels integer[] not null default '{}',
      updated_at timestamptz not null default now()
    )`))
  return schemaReady
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', chunk => { raw += chunk; if (raw.length > 10000) reject(new Error('Body too large')) })
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')) } catch (error) { reject(error) } })
    req.on('error', reject)
  })
}

async function handleChallengeProgress(req, res, url) {
  if (url.pathname !== '/api/challenge/progress' && url.pathname !== '/api/challenge/ranking') return false
  if (!pool) { json(res, 503, { error: 'Database is not configured' }); return true }
  try {
    await ensureSchema()
    const session = getPortalSession(req)
    if (url.pathname === '/api/challenge/ranking') {
      if (req.method !== 'GET') { json(res, 405, { error: 'Method not allowed' }); return true }
      const ranking = await pool.query(
        `select u.username, p.highest_cleared_level, u.portal_user_id = $1 as is_current_user
           from inmu_challenge_progress p
           join inmu_game_users u on u.id = p.game_user_id
          where p.highest_cleared_level > 0
          order by p.highest_cleared_level desc, p.updated_at asc, u.username asc
          limit 100`,
        [session.portalUserId]
      )
      json(res, 200, {
        ranking: ranking.rows.map((row, index) => ({
          position: index + 1,
          username: row.username,
          highestClearedLevel: row.highest_cleared_level,
          isCurrentUser: row.is_current_user,
        })),
      })
      return true
    }
    const body = req.method === 'POST' ? await readBody(req) : {}
    const user = await pool.query('select id from inmu_game_users where portal_user_id = $1 limit 1', [session.portalUserId])
    if (!user.rows[0]) { json(res, 404, { error: 'PORTAL連携ユーザーが見つかりません' }); return true }
    if (req.method === 'GET') {
      const progress = await pool.query('select highest_cleared_level, cleared_levels from inmu_challenge_progress where game_user_id = $1', [user.rows[0].id])
      const row = progress.rows[0] || { highest_cleared_level: 0, cleared_levels: [] }
      json(res, 200, { highestClearedLevel: row.highest_cleared_level, highestUnlockedLevel: Math.min(100, row.highest_cleared_level + 1), clearedLevels: row.cleared_levels })
      return true
    }
    if (req.method !== 'POST') { json(res, 405, { error: 'Method not allowed' }); return true }
    const level = Math.min(100, Math.max(1, Number(body.level) || 0))
    const result = await pool.query(
      `insert into inmu_challenge_progress (game_user_id, highest_cleared_level, cleared_levels, updated_at)
       values ($1, $2, array[$2]::int[], now())
       on conflict (game_user_id) do update set
         highest_cleared_level = greatest(inmu_challenge_progress.highest_cleared_level, excluded.highest_cleared_level),
         cleared_levels = (select array_agg(distinct x order by x) from unnest(inmu_challenge_progress.cleared_levels || excluded.cleared_levels) x),
         updated_at = now()
       returning highest_cleared_level, cleared_levels`,
      [user.rows[0].id, level]
    )
    json(res, 200, { saved: true, highestClearedLevel: result.rows[0].highest_cleared_level, clearedLevels: result.rows[0].cleared_levels })
  } catch (error) {
    const unauthorized = /signature|token|expired|incomplete/i.test(error.message)
    json(res, unauthorized ? 401 : 500, { error: unauthorized ? 'PORTALログインが必要です' : error.message })
  }
  return true
}

module.exports = { handleChallengeProgress }
