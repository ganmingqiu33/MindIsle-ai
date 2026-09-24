/**
 * 心屿用户认证服务
 * ------------------------------------------------------------------
 * 账号体系：注册 / 登录 / 修改密码（邮箱作为登录账号）
 * 管理功能：管理员登录 / 用户列表 / 单发邮件 / 群发邮件
 * 密码 bcrypt 加盐哈希，登录态为 JWT（HS256）。
 * 响应约定与前端 axios 拦截器一致：HTTP 恒 200，body.code 判成败。
 *
 * 环境变量（本地 ./auth-service/.env，服务器 /etc/auth-service.env）：
 *   PORT          监听端口（默认 3002，仅监听 127.0.0.1）
 *   JWT_SECRET    JWT 签名密钥（必须与配额网关共享）
 *   DB_PATH       SQLite 文件路径（默认 ./auth.db）
 *   ADMIN_USER    管理员账号（默认 admin）
 *   ADMIN_PASS    管理员密码（默认 admin123）
 *   SMTP_HOST     SMTP 服务器地址，如 smtp.qq.com
 *   SMTP_PORT     SMTP 端口（465 / 587）
 *   SMTP_SECURE   是否启用 TLS（true / false，465 用 true）
 *   SMTP_USER     SMTP 登录邮箱
 *   SMTP_PASS     SMTP 授权码（非邮箱登录密码）
 *   SMTP_FROM     发件人显示，如 心屿 <noreply@xinyu.com>
 * ------------------------------------------------------------------
 */
require('dotenv').config()
const http = require('http')
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')

const PORT = Number(process.env.PORT || 3002)
const JWT_SECRET = process.env.JWT_SECRET || ''
const DB_PATH = process.env.DB_PATH || `${__dirname}/auth.db`
const TOKEN_TTL = '30d'

const ADMIN_USER = process.env.ADMIN_USER || 'admin'
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123'

if (!JWT_SECRET) {
  console.error('[auth-service] FATAL: JWT_SECRET 未设置')
  process.exit(1)
}

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

// 迁移：旧表 username → email（平滑处理，已有库直接改列名）
try {
  const cols = db.prepare("PRAGMA table_info(users)").all()
  const hasUsername = cols.some((c) => c.name === 'username')
  const hasEmail = cols.some((c) => c.name === 'email')
  if (hasUsername && !hasEmail) {
    db.exec('ALTER TABLE users RENAME COLUMN username TO email')
    console.log('[auth-service] 已迁移 username → email')
  }
  // 增加 avatar 列（老库平滑升级）
  if (!cols.some((c) => c.name === 'avatar')) {
    db.exec("ALTER TABLE users ADD COLUMN avatar INTEGER NOT NULL DEFAULT 1")
    console.log('[auth-service] 已添加 avatar 列')
  }
} catch (e) {
  console.warn('[auth-service] 迁移检查跳过：', e.message)
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    nickname      TEXT NOT NULL,
    avatar        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- 站内信：管理员发给用户的消息
  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    subject    TEXT NOT NULL,
    content    TEXT NOT NULL,
    is_read    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, is_read);

  -- 用户数据（按 type 存 JSON：plans / diary / focus / chat / profile 等）
  CREATE TABLE IF NOT EXISTS user_data (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    data_type  TEXT NOT NULL,
    data       TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, data_type)
  );
`)

// 首次部署播种演示账号 demo@xinyu.com / 123456，已存在则跳过
const seedStmt = db.prepare('SELECT id FROM users WHERE email = ?')
if (!seedStmt.get('demo@xinyu.com')) {
  const hash = bcrypt.hashSync('123456', 10)
  db.prepare('INSERT INTO users (email, password_hash, nickname) VALUES (?, ?, ?)').run(
    'demo@xinyu.com', hash, '岛民',
  )
  console.log('[auth-service] 已播种演示账号 demo@xinyu.com / 123456')
}

const findByEmail = db.prepare('SELECT * FROM users WHERE email = ?')
const findById = db.prepare('SELECT id, email, nickname, avatar, created_at FROM users WHERE id = ?')
const listAll = db.prepare('SELECT id, email, nickname, avatar, created_at FROM users ORDER BY id DESC')
const insertUser = db.prepare('INSERT INTO users (email, password_hash, nickname) VALUES (?, ?, ?)')
const updateHash = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
const updateProfile = db.prepare('UPDATE users SET nickname = ?, avatar = ? WHERE id = ?')

// 站内信
const insertMessage = db.prepare('INSERT INTO messages (user_id, subject, content) VALUES (?, ?, ?)')
const listMessages = db.prepare('SELECT * FROM messages WHERE user_id = ? ORDER BY id DESC')
const getMessage = db.prepare('SELECT * FROM messages WHERE id = ? AND user_id = ?')
const markRead = db.prepare('UPDATE messages SET is_read = 1 WHERE id = ? AND user_id = ?')
const unreadCount = db.prepare('SELECT COUNT(*) AS c FROM messages WHERE user_id = ? AND is_read = 0')

// 用户数据
const getUserData = db.prepare('SELECT data FROM user_data WHERE user_id = ? AND data_type = ?')
const upsertUserData = db.prepare(`
  INSERT INTO user_data (user_id, data_type, data, updated_at) VALUES (?, ?, ?, datetime('now'))
  ON CONFLICT(user_id, data_type) DO UPDATE SET data = excluded.data, updated_at = datetime('now')
`)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const signUser = (user) =>
  jwt.sign({ sub: user.id, email: user.email, role: 'user' }, JWT_SECRET, { expiresIn: TOKEN_TTL })
const signAdmin = () =>
  jwt.sign({ sub: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: TOKEN_TTL })
const publicInfo = (u) => ({ id: u.id, email: u.email, nickname: u.nickname || u.email, avatar: u.avatar || 1 })

const ok = (res, data) => send(res, 200, { code: 200, data })
const fail = (res, msg, code = 500) => send(res, 200, { code, msg })
function send(res, status, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > 256 * 1024) req.destroy()
      chunks.push(c)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}'))
      } catch {
        resolve(null)
      }
    })
    req.on('error', () => resolve(null))
  })

// 从 Authorization: Bearer <token> 解析当前用户（普通用户）
function authUser(req) {
  const m = /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization || '').trim())
  if (!m) return null
  try {
    const payload = jwt.verify(m[1], JWT_SECRET)
    if (payload.role !== 'user') return null
    return findById.get(payload.sub) || null
  } catch {
    return null
  }
}

// 解析管理员 token
function authAdmin(req) {
  const m = /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization || '').trim())
  if (!m) return null
  try {
    const payload = jwt.verify(m[1], JWT_SECRET)
    return payload.role === 'admin' ? payload : null
  } catch {
    return null
  }
}

/* ---------------- 邮件发送 ---------------- */
let transporter = null
function getTransporter() {
  if (transporter) return transporter
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 465),
    secure: String(SMTP_SECURE) !== 'false',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
  return transporter
}

async function sendMail({ to, subject, text, html }) {
  const t = getTransporter()
  if (!t) throw new Error('SMTP 未配置，请在服务端环境变量中设置 SMTP_HOST / SMTP_USER / SMTP_PASS')
  const from = process.env.SMTP_FROM || process.env.SMTP_USER
  return t.sendMail({ from, to, subject, text, html })
}

/* ---------------- HTTP 路由 ---------------- */
const server = http.createServer(async (req, res) => {
  const path = (req.url || '').split('?')[0]

  /* ---------- 用户注册 ---------- */
  if (req.method === 'POST' && path === '/user/register') {
    const body = await readBody(req)
    if (!body) return fail(res, '请求格式错误')
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const nickname = String(body.nickname || '').trim()

    if (!EMAIL_RE.test(email)) return fail(res, '请输入有效的邮箱地址')
    if (!nickname) return fail(res, '请输入昵称')
    if (nickname.length < 1 || nickname.length > 20) return fail(res, '昵称长度需为 1-20 位')
    if (password.length < 6 || password.length > 64) return fail(res, '密码长度需为 6-64 位')
    if (findByEmail.get(email)) return fail(res, '该邮箱已注册')

    const hash = bcrypt.hashSync(password, 10)
    let user
    try {
      const info = insertUser.run(email, hash, nickname)
      user = findById.get(info.lastInsertRowid)
    } catch {
      return fail(res, '该邮箱已注册')
    }
    return ok(res, { token: signUser(user), userInfo: publicInfo(user) })
  }

  /* ---------- 用户登录 ---------- */
  if (req.method === 'POST' && path === '/user/login') {
    const body = await readBody(req)
    if (!body) return fail(res, '请求格式错误')
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')

    const row = findByEmail.get(email)
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      return fail(res, '邮箱或密码错误')
    }
    return ok(res, { token: signUser(row), userInfo: publicInfo(row) })
  }

  /* ---------- 修改密码 ---------- */
  if (req.method === 'PUT' && path === '/user/updatePassword') {
    const user = authUser(req)
    if (!user) return fail(res, '登录状态已失效，请重新登录', 401)

    const body = await readBody(req)
    if (!body) return fail(res, '请求格式错误')
    const oldPassword = String(body.oldPassword || '')
    const newPassword = String(body.newPassword || '')
    if (newPassword.length < 6 || newPassword.length > 64) return fail(res, '新密码长度需为 6-64 位')

    const row = findByEmail.get(user.email)
    if (!bcrypt.compareSync(oldPassword, row.password_hash)) return fail(res, '原密码不正确')

    updateHash.run(bcrypt.hashSync(newPassword, 10), user.id)
    return ok(res, { token: signUser(user), userInfo: publicInfo(user) })
  }

  /* ---------- 更新用户资料（昵称 / 头像） ---------- */
  if (req.method === 'PUT' && path === '/user/profile') {
    const user = authUser(req)
    if (!user) return fail(res, '登录状态已失效，请重新登录', 401)

    const body = await readBody(req)
    if (!body) return fail(res, '请求格式错误')
    const nickname = String(body.nickname || '').trim()
    const avatar = body.avatar != null ? Number(body.avatar) : null

    if (nickname && (nickname.length < 1 || nickname.length > 20)) {
      return fail(res, '昵称长度需为 1-20 位')
    }
    if (avatar != null && (avatar < 1 || avatar > 99)) {
      return fail(res, '头像编号无效')
    }

    const newNickname = nickname || user.nickname
    const newAvatar = avatar != null ? avatar : (user.avatar || 1)
    updateProfile.run(newNickname, newAvatar, user.id)
    const updated = findById.get(user.id)
    return ok(res, { userInfo: publicInfo(updated) })
  }

  /* ---------- 管理员登录 ---------- */
  if (req.method === 'POST' && path === '/admin/login') {
    const body = await readBody(req)
    if (!body) return fail(res, '请求格式错误')
    const account = String(body.account || '').trim()
    const password = String(body.password || '')
    if (account !== ADMIN_USER || password !== ADMIN_PASS) {
      return fail(res, '管理员账号或密码错误')
    }
    return ok(res, {
      token: signAdmin(),
      userInfo: { account, role: 'admin', name: '管理员' },
    })
  }

  /* ---------- 管理员：用户列表 ---------- */
  if (req.method === 'GET' && path === '/admin/users') {
    if (!authAdmin(req)) return fail(res, '无权限访问', 401)
    const users = listAll.all()
    return ok(res, { list: users, total: users.length })
  }

  /* ---------- 管理员：发站内信给单个用户 ---------- */
  if (req.method === 'POST' && path === '/admin/send-email') {
    if (!authAdmin(req)) return fail(res, '无权限访问', 401)
    const body = await readBody(req)
    if (!body) return fail(res, '请求格式错误')
    const to = String(body.to || '').trim().toLowerCase()
    const subject = String(body.subject || '').trim()
    const text = String(body.text || '')
    if (!EMAIL_RE.test(to)) return fail(res, '收件人邮箱格式不正确')
    if (!subject) return fail(res, '消息主题不能为空')
    if (!text) return fail(res, '消息内容不能为空')

    const target = findByEmail.get(to)
    if (!target) return fail(res, '该用户不存在')

    insertMessage.run(target.id, subject, text)

    // 若配置了 SMTP，同时发真实邮件
    let emailSent = false
    if (getTransporter()) {
      try {
        await sendMail({ to, subject, text })
        emailSent = true
      } catch (e) {
        console.warn('[auth-service] 真实邮件发送失败（站内信已存入）：', e.message)
      }
    }
    return ok(res, { userId: target.id, email: to, emailSent })
  }

  /* ---------- 管理员：群发站内信（所有用户） ---------- */
  if (req.method === 'POST' && path === '/admin/broadcast-email') {
    if (!authAdmin(req)) return fail(res, '无权限访问', 401)
    const body = await readBody(req)
    if (!body) return fail(res, '请求格式错误')
    const subject = String(body.subject || '').trim()
    const text = String(body.text || '')
    if (!subject) return fail(res, '消息主题不能为空')
    if (!text) return fail(res, '消息内容不能为空')

    const users = listAll.all()
    const insertMany = db.prepare('INSERT INTO messages (user_id, subject, content) VALUES (?, ?, ?)')
    const tx = db.transaction((list) => {
      for (const u of list) insertMany.run(u.id, subject, text)
    })
    tx(users)

    // 若配置了 SMTP，同时发真实邮件
    let emailSuccess = 0
    if (getTransporter()) {
      for (const u of users) {
        try {
          await sendMail({ to: u.email, subject, text })
          emailSuccess++
        } catch (e) {
          console.warn('[auth-service] 群发真实邮件失败', u.email, e.message)
        }
      }
    }
    return ok(res, { total: users.length, stored: users.length, emailSuccess })
  }

  /* ---------- 用户：获取我的站内信列表 ---------- */
  if (req.method === 'GET' && path === '/user/messages') {
    const user = authUser(req)
    if (!user) return fail(res, '登录状态已失效，请重新登录', 401)
    const list = listMessages.all(user.id)
    const unread = unreadCount.get(user.id).c
    return ok(res, { list, unread })
  }

  /* ---------- 用户：标记站内信已读 ---------- */
  if (req.method === 'PUT' && path.startsWith('/user/messages/') && path.endsWith('/read')) {
    const user = authUser(req)
    if (!user) return fail(res, '登录状态已失效，请重新登录', 401)
    const id = Number(path.split('/')[3])
    if (!id) return fail(res, '消息 ID 无效')
    markRead.run(id, user.id)
    return ok(res, { id })
  }

  /* ---------- 用户：未读消息数 ---------- */
  if (req.method === 'GET' && path === '/user/messages/unread') {
    const user = authUser(req)
    if (!user) return fail(res, '登录状态已失效，请重新登录', 401)
    return ok(res, { unread: unreadCount.get(user.id).c })
  }

  /* ---------- 用户数据：读取某类数据 ---------- */
  if (req.method === 'GET' && path.startsWith('/user/data/')) {
    const user = authUser(req)
    if (!user) return fail(res, '登录状态已失效，请重新登录', 401)
    const type = decodeURIComponent(path.slice('/user/data/'.length))
    if (!type) return fail(res, '数据类型不能为空')
    const row = getUserData.get(user.id, type)
    return ok(res, { type, data: row ? row.data : null })
  }

  /* ---------- 用户数据：保存某类数据 ---------- */
  if (req.method === 'PUT' && path.startsWith('/user/data/')) {
    const user = authUser(req)
    if (!user) return fail(res, '登录状态已失效，请重新登录', 401)
    const type = decodeURIComponent(path.slice('/user/data/'.length))
    if (!type) return fail(res, '数据类型不能为空')
    const body = await readBody(req)
    if (!body || body.data == null) return fail(res, '数据不能为空')
    const dataStr = typeof body.data === 'string' ? body.data : JSON.stringify(body.data)
    upsertUserData.run(user.id, type, dataStr)
    return ok(res, { type, saved: true })
  }

  /* ---------- 健康检查 ---------- */
  if (req.method === 'GET' && path === '/__health') {
    return ok(res, { service: 'auth-service', ok: true, smtpConfigured: !!getTransporter() })
  }

  send(res, 404, { code: 404, msg: 'not found' })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[auth-service] listening on http://127.0.0.1:${PORT} | db ${DB_PATH}`)
  console.log(`[auth-service] admin: ${ADMIN_USER} | smtp: ${getTransporter() ? 'configured' : 'NOT configured'}`)
})
