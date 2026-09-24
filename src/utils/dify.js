// Dify Chatflow 流式客户端
// 浏览器只请求同源的 /dify（Vite 代理在服务端注入 API Key），密钥不出现在代码/网络面板中
// 接口文档：Dify -> 访问 API；流式协议为 SSE（data: {json} 逐行推送）

import { useFrontAuth } from '@/utils/frontAuth'
import { applyQuotaHeaders } from '@/utils/usageStore'

export class DifyError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'DifyError'
    if (code) this.code = code
  }
}

// Dify 终端用户标识：与 chatStore.getDifyUser 保持一致
// 登录用户用 u-uid，未登录访客用本地随机 v-id
const VISITOR_KEY = 'xinyu-visitor-id'
// 登录令牌随请求带给配额网关（X-User-Token），网关验签后按用户 ID 计数；该头在网关转发 Dify 前被剥离
function authHeaders() {
  try {
    const t = localStorage.getItem('frontToken')
    return t ? { 'X-User-Token': t } : {}
  } catch {
    return {}
  }
}
function getDifyUserInline() {
  const { user } = useFrontAuth()
  if (user.value?.id) return `u-${user.value.id}`
  try {
    let vid = localStorage.getItem(VISITOR_KEY)
    if (!vid) {
      vid = 'v-' + Math.random().toString(36).slice(2, 10)
      localStorage.setItem(VISITOR_KEY, vid)
    }
    return vid
  } catch {
    return 'v-anon'
  }
}

// 北京时间注入：Dify 1.17 Agent 内置时间工具存在 UTC 硬编码问题（timezone 参数被忽略），
// 改为前端随请求附带当前北京时间作为权威依据，仅影响发往 Dify 的文本，UI 显示不受影响
function buildTimeTag() {
  try {
    const fmt = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    return `（系统备注：当前北京时间 ${fmt.format(new Date())}，回答时间、日期、星期问题以此为准，无需调用时间工具）`
  } catch {
    return ''
  }
}

/**
 * 上传文件到 Dify（支持 doc/docx/txt/md/pdf 等）
 * 文件由 Dify 解析为文本，返回的 upload_file_id 可在 chat-messages 的 files 参数中引用
 * @param {File} file 浏览器文件对象
 * @returns {Promise<{ id: string, name: string, size: number, type: string }>}
 */
export async function difyUploadFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('user', getDifyUserInline())
  let resp
  try {
    resp = await fetch('/dify/v1/files/upload', {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    })
  } catch (e) {
    throw new DifyError('文件上传失败：无法连接心屿服务')
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new DifyError(`文件上传失败（HTTP ${resp.status}）${text.slice(0, 120)}`)
  }
  const data = await resp.json()
  if (!data?.id) throw new DifyError('文件上传失败：未返回文件 ID')
  return {
    id: data.id,
    name: data.name || file.name,
    size: data.size || file.size,
    type: data.mime_type || file.type || '',
  }
}

/**
 * 调用 Dify 聊天接口（流式）
 * @param {Object} opts
 * @param {string} opts.query          用户本轮输入
 * @param {string} opts.conversationId Dify 会话 ID（首轮传 ''，之后带上一轮返回值，记忆由 Dify 管理）
 * @param {string} opts.user           终端用户唯一标识
 * @param {Array}  [opts.files]        附加文件数组：[{ type:'document', transfer_method:'local_file', upload_file_id }]
 * @param {(piece: string) => void} opts.onToken 每收到一段增量文字时回调
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{ conversationId: string, sources: Array }>}
 */
export async function difyChatStream({ query, conversationId = '', user, onToken, signal, files }) {
  let resp
  try {
    const body = {
      inputs: {},
      query: `${buildTimeTag()}\n\n${query}`,
      response_mode: 'streaming',
      conversation_id: conversationId,
      user,
    }
    if (files && files.length) body.files = files
    resp = await fetch('/dify/v1/chat-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new DifyError('无法连接心屿服务，请确认 Docker 中的 Dify 已启动')
  }

  // 网关在每次响应头回写当日配额，前端据此同步服务端权威计数
  applyQuotaHeaders(resp.headers)

  // 配额网关 403：今日次数已用完
  if (resp.status === 403) {
    let payload = null
    try {
      payload = await resp.json()
    } catch {}
    if (payload?.code === 'AI_USAGE_EXHAUSTED') {
      throw new DifyError(payload.message || '今日 AI 对话次数已用完', 'AI_USAGE_EXHAUSTED')
    }
    throw new DifyError(payload?.message || '请求被拒绝（403）')
  }

  if (!resp.ok || !resp.body) {
    const text = await resp.text().catch(() => '')
    throw new DifyError(`心屿服务异常（HTTP ${resp.status}）${text.slice(0, 120)}`)
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let cid = conversationId
  let sources = []
  // Agent 应用会先推 agent_message 增量块，结束前再发一条含全文的 message 事件；
  // 一旦收到过 agent_message 就忽略 message，避免全文重复拼接
  let sawAgentMessage = false

  const handleLine = (line) => {
    if (!line.startsWith('data:')) return
    const jsonStr = line.slice(5).trim()
    if (!jsonStr) return
    let evt
    try {
      evt = JSON.parse(jsonStr)
    } catch {
      return
    }

    if (evt.event === 'error') {
      throw new DifyError(evt.message || '心屿服务返回了错误')
    }
    // chatflow 增量文字在 message 事件；agent 模式在 agent_message 事件
    if (evt.event === 'agent_message') {
      sawAgentMessage = true
      if (evt.answer) onToken(evt.answer)
      if (evt.conversation_id) cid = evt.conversation_id
    } else if (evt.event === 'message' && !sawAgentMessage) {
      if (evt.answer) onToken(evt.answer)
      if (evt.conversation_id) cid = evt.conversation_id
    }
    // 结束事件：带回 conversation_id 和知识库命中片段（引用来源）
    if (evt.event === 'message_end') {
      cid = evt.conversation_id || cid
      sources = evt.metadata?.retriever_resources || []
    }
  }

  // SSE 可能半包/粘包，用缓冲区按行切
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim()
      buffer = buffer.slice(idx + 1)
      if (line) handleLine(line)
    }
  }
  if (buffer.trim()) handleLine(buffer.trim())

  return { conversationId: cid, sources }
}
