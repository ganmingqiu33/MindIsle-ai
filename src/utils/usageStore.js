// AI 对话次数管理（模块级单例）
// 双模式：
//   - server 模式（生产）：配额网关为权威，计数在服务器 SQLite，清浏览器缓存无法绕过
//     页面挂载时 GET /dify/__quota 同步；每次聊天响应头 X-Quota-* 实时回写
//   - local 模式（开发，网关不存在时自动回退）：按用户 ID 存 localStorage，跨天归零
// 口径：仅登录用户可用，每账号/IP 每天 N 次，按北京时间当日 0 点重置
// 每发送一条用户消息计 1 次（含知识库文件总结）；local 模式下网络失败退还

import { ref, computed } from 'vue'
import { useFrontAuth } from '@/utils/frontAuth'

const STORAGE_KEY = 'xinyu-ai-usage'
export const AI_FREE_LIMIT = 10

const usageMap = ref(load())
// 'unknown' 初始化 → 'server'（网关在线）/ 'local'（无网关，开发兜底）
const mode = ref('unknown')
const serverState = ref({ limit: AI_FREE_LIMIT, used: 0, remaining: AI_FREE_LIMIT, date: '' })

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usageMap.value))
  } catch {}
}

// 北京日期 YYYY-MM-DD
function todayKey() {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const get = (t) => parts.find((p) => p.type === t).value
    return `${get('year')}-${get('month')}-${get('day')}`
  } catch {
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
}

// 从网关响应头同步配额（difyChatStream 每次响应后调用）
// 注意：非网关响应（如 Dify 直连、Vite 代理错误页）没有这些头，
// get() 返回 null 而 Number(null)===0 是 finite，必须显式判 null，否则会误判为额度耗尽
export function applyQuotaHeaders(headers) {
  const rawLimit = headers?.get?.('x-quota-limit')
  const rawUsed = headers?.get?.('x-quota-used')
  if (rawLimit == null || rawUsed == null) return
  const limit = Number(rawLimit)
  const used = Number(rawUsed)
  if (!Number.isFinite(limit) || !Number.isFinite(used) || limit <= 0) return
  const rawRemaining = headers.get('x-quota-remaining')
  const remaining = rawRemaining != null && Number.isFinite(Number(rawRemaining))
    ? Number(rawRemaining)
    : Math.max(0, limit - used)
  mode.value = 'server'
  serverState.value = {
    limit,
    used,
    remaining,
    date: headers.get('x-quota-date') || todayKey(),
  }
}

export function useAiUsage() {
  const { user } = useFrontAuth()
  const uid = computed(() => (user.value?.id ? `u-${user.value.id}` : ''))

  const localUsed = () => {
    if (!uid.value) return 0
    const rec = usageMap.value[uid.value]
    return rec && rec.date === todayKey() ? rec.used || 0 : 0
  }

  const used = computed(() => (mode.value === 'server' ? serverState.value.used : localUsed()))
  const limit = computed(() => (mode.value === 'server' ? serverState.value.limit : AI_FREE_LIMIT))
  const remaining = computed(() => Math.max(0, limit.value - used.value))
  const canUse = computed(() => {
    if (mode.value === 'server') return serverState.value.remaining > 0
    return !!uid.value && localUsed() < AI_FREE_LIMIT
  })
  const exhausted = computed(() => mode.value === 'server' ? serverState.value.remaining <= 0 : !!uid.value && localUsed() >= AI_FREE_LIMIT)

  // 主动向网关查询配额（页面挂载时调用）；网关不存在则回退本地模式
  const refreshQuota = async () => {
    try {
      const tokenHeaders = (() => {
        try {
          const t = localStorage.getItem('frontToken')
          return t ? { 'X-User-Token': t } : {}
        } catch {
          return {}
        }
      })()
      const resp = await fetch('/dify/__quota', {
        headers: { Accept: 'application/json', ...tokenHeaders },
      })
      // 网关返回 200 JSON；Dify 直连时这里可能是 404 HTML 页，必须双重校验
      if (!resp.ok || !resp.headers.get('content-type')?.includes('application/json')) throw new Error('no gateway')
      const data = await resp.json()
      if (!Number.isFinite(data.limit) || data.limit <= 0 || !Number.isFinite(data.used)) throw new Error('bad payload')
      mode.value = 'server'
      serverState.value = {
        limit: data.limit,
        used: data.used,
        remaining: Number.isFinite(data.remaining) ? Math.max(0, data.remaining) : Math.max(0, data.limit - data.used),
        date: data.date || todayKey(),
      }
      return true
    } catch {
      mode.value = 'local'
      return false
    }
  }

  // local 模式扣减；server 模式为 no-op（服务端计数）
  const consume = () => {
    if (mode.value === 'server') return true
    if (!uid.value || localUsed() >= AI_FREE_LIMIT) return false
    const n = localUsed() + 1
    usageMap.value[uid.value] = { date: todayKey(), used: n }
    persist()
    return true
  }

  // local 模式退还（消息没送达时）；server 模式不处理（服务端仅对成功受理计数）
  const refund = () => {
    if (mode.value === 'server') return
    if (!uid.value) return
    const rec = usageMap.value[uid.value]
    if (!rec || rec.date !== todayKey()) return
    const n = Math.max(0, (rec.used || 0) - 1)
    if (n === 0) delete usageMap.value[uid.value]
    else rec.used = n
    persist()
  }

  return {
    mode,
    limit,
    used,
    remaining,
    canUse,
    exhausted,
    consume,
    refund,
    refreshQuota,
  }
}
