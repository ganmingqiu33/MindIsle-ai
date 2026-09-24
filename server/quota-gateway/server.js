/**
 * 心屿 AI 配额网关
 * ------------------------------------------------------------------
 * 位于 Nginx 与 Dify 之间，对 POST /v1/chat-messages 按「身份 + 北京日期」
 * 计数，超量直接 403，请求到不了 Dify，从而无法通过清浏览器缓存绕过。
 *
 * 身份优先级：X-User-Token 里的 JWT（登录用户，与认证服务共享密钥） >
 *             X-User-Id 请求头（可信内网调用） > 客户端 IP（未登录访客）
 * 计数存储：SQLite（better-sqlite3，同步、零外部服务）
 *
 * 环境变量：
 *   PORT           监听端口（默认 3001，仅监听 127.0.0.1）
 *   DIFY_UPSTREAM Dify 地址（默认 http://127.0.0.1:8080）
 *   DIFY_API_KEY   Dify App API Key（Bearer，在本层注入，浏览器不可见）
 *   DAILY_LIMIT    每身份每日次数（默认 10）
 *   JWT_SECRET     认证服务共享密钥，用于校验 X-User-Token
 *   DB_PATH        SQLite 文件路径（默认 ./quota.db）
 * ------------------------------------------------------------------
 */
const http = require('http')
const Database = require('better-sqlite3')
const jwt = require('jsonwebtoken')

const PORT = Number(process.env.PORT || 3001)
const UPSTREAM = process.env.DIFY_UPSTREAM || 'http://127.0.0.1:8080'
const API_KEY = process.env.DIFY_API_KEY || ''
const DAILY_LIMIT = Number(process.env.DAILY_LIMIT || 10)
const JWT_SECRET = process.env.JWT_SECRET || ''
const DB_PATH = process.env.DB_PATH || `${__dirname}/quota.db`

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.exec(`
  CREATE TABLE IF NOT EXISTS quota (
    identity TEXT NOT NULL,
    date     TEXT NOT NULL,
    used     INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (identity, date)
  );
`)
// 启动时清理 7 天前的计数
db.prepare("DELETE FROM quota WHERE date < date('now', '-7 days')").run()

const selectStmt = db.prepare('SELECT used FROM quota WHERE identity = ? AND date = ?')
const insertStmt = db.prepare('INSERT INTO quota (identity, date, used) VALUES (?, ?, 1)')
const incrStmt = db.prepare('UPDATE quota SET used = used + 1 WHERE identity = ? AND date = ?')

// 北京日期 YYYY-MM-DD
function beijingDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (t) => parts.find((p) => p.type === t).value
  return `${get('year')}-${get('month')}-${get('day')}`
}

// 取当前身份已用次数（跨天自动归零）
function getUsed(identity, date) {
  const row = selectStmt.get(identity, date)
  return row?.used || 0
}

// 原子计数 +1（行级唯一约束保证并发不超发）
function consume(identity, date) {
  const tx = db.transaction(() => {
    if (selectStmt.get(identity, date)) incrStmt.run(identity, date)
    else insertStmt.run(identity, date)
    return selectStmt.get(identity, date).used
  })
  return tx()
}

// 解析身份：登录用户的 JWT（X-User-Token）优先，其次 X-User-Id（可信内网调用），否则按 IP（未登录访客）
function resolveIdentity(req) {
  const token = String(req.headers['x-user-token'] || '').trim()
  if (token && JWT_SECRET) {
    try {
      const payload = jwt.verify(token, JWT_SECRET)
      if (payload.sub) return { identity: `u:${payload.sub}`, userToken: token }
    } catch {
      // token 无效则降级为 IP，不影响请求转发
    }
  }
  const uid = String(req.headers['x-user-id'] || '').trim()
  if (uid && /^[a-zA-Z0-9_\-@.]{1,64}$/.test(uid)) return { identity: `u:${uid}`, userToken: token }
  const xff = req.headers['x-forwarded-for']
  const ip = xff ? String(xff).split(',')[0].trim() : req.socket.remoteAddress || 'unknown'
  return { identity: `ip:${ip.replace('::ffff:', '')}`, userToken: token }
}

const quotaHeaders = (identity, date) => {
  const used = getUsed(identity, date)
  return {
    used,
    remaining: Math.max(0, DAILY_LIMIT - used),
    headers: {
      'x-quota-limit': String(DAILY_LIMIT),
      'x-quota-used': String(used),
      'x-quota-remaining': String(Math.max(0, DAILY_LIMIT - used)),
      'x-quota-date': date,
    },
  }
}

const json = (res, status, obj, extraHeaders = {}) => {
  const body = JSON.stringify(obj)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders,
  })
  res.end(body)
}

const server = http.createServer(async (req, res) => {
  const date = beijingDate()
  const { identity } = resolveIdentity(req)
  const url = req.url || '/'

  // 状态查询接口（不转发 Dify，不计数）
  if (req.method === 'GET' && url === '/__quota') {
    const { used, remaining, headers } = quotaHeaders(identity, date)
    return json(res, 200, { limit: DAILY_LIMIT, used, remaining, date }, headers)
  }

  // 收集请求体
  const chunks = []
  for await (const c of req) chunks.push(c)
  const bodyBuf = Buffer.concat(chunks)

  const isChat = req.method === 'POST' && url.split('?')[0] === '/v1/chat-messages'

  // 配额裁决：仅聊天接口计数
  if (isChat) {
    const used = getUsed(identity, date)
    if (used >= DAILY_LIMIT) {
      const { headers } = quotaHeaders(identity, date)
      return json(
        res,
        403,
        { code: 'AI_USAGE_EXHAUSTED', message: `今日 ${DAILY_LIMIT} 次 AI 对话已用完，明天 0 点重置` },
        headers,
      )
    }
  }

  // 透传到 Dify（网关注入密钥，客户端传的 Authorization 被覆盖）
  const fwdHeaders = { ...req.headers }
  delete fwdHeaders.host
  delete fwdHeaders['x-user-id']
  delete fwdHeaders['x-user-token']
  delete fwdHeaders['x-forwarded-for']
  delete fwdHeaders.authorization
  if (API_KEY) fwdHeaders.authorization = `Bearer ${API_KEY}`

  const ctrl = new AbortController()
  req.on('close', () => ctrl.abort())

  let upstream
  try {
    upstream = await fetch(`${UPSTREAM}${url}`, {
      method: req.method,
      headers: fwdHeaders,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : bodyBuf,
      signal: ctrl.signal,
      // SSE 必须禁用压缩/缓存依赖，Node fetch 默认不发 accept-encoding 也行
      redirect: 'manual',
    })
  } catch (e) {
    if (e.name === 'AbortError') return
    return json(res, 502, { code: 'UPSTREAM_UNAVAILABLE', message: 'Dify 服务不可用' })
  }

  // 只有 Dify 成功受理聊天请求（2xx）才计数；4xx/5xx 不扣次数
  if (isChat && upstream.ok) consume(identity, date)

  // 回写响应头 + X-Quota-*
  const { headers: qh } = quotaHeaders(identity, date)
  const outHeaders = {}
  upstream.headers.forEach((v, k) => {
    if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(k.toLowerCase())) {
      outHeaders[k] = v
    }
  })
  Object.assign(outHeaders, qh)
  res.writeHead(upstream.status, outHeaders)

  // SSE / 普通响应统一流式透传；客户端中断即停止拉取
  if (upstream.body) {
    const reader = upstream.body.getReader()
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        res.write(Buffer.from(value))
      }
    } catch {
      // 上游或客户端中断，静默结束
    } finally {
      res.end()
    }
  } else {
    res.end()
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[quota-gateway] listening on http://127.0.0.1:${PORT}`)
  console.log(`[quota-gateway] upstream ${UPSTREAM} | daily limit ${DAILY_LIMIT} | db ${DB_PATH}`)
  if (!API_KEY) console.warn('[quota-gateway] WARNING: DIFY_API_KEY 未设置，将透传客户端自带密钥')
})
