import { ref, computed } from 'vue'
import { difyChatStream } from '@/utils/dify'
import { useFrontAuth } from '@/utils/frontAuth'
import { extractAction } from '@/utils/actionProtocol'
import { addPlan, plansOn, isDoneOn } from '@/utils/plansStore'
import { sessions as focusSessions, todayFocus } from '@/utils/focusStore'
import { diaryState, moodOf } from '@/utils/diaryStore'
import { markSummarizing, markSummarized, markSummaryError, buildDifyFiles } from '@/utils/knowledgeStore'
import { useAiUsage } from '@/utils/usageStore'
import { scopedKey } from '@/utils/storageScope'
import { pullFromServer, pushToServer } from '@/utils/serverSync'

const { canUse, consume, refund } = useAiUsage()

// 模块级单例：Layout 的历史列表和 Home 的对话页共享同一份会话数据（按账号隔离）
const STORAGE_BASE = 'xinyu-chat-sessions'
const SERVER_TYPE = 'chat'
const VISITOR_KEY = 'xinyu-visitor-id'

const { user } = useFrontAuth()

// Dify 要求每个终端用户有唯一标识：登录用户用 uid，未登录访客用本地随机 id
const getDifyUser = () => {
  if (user.value?.id) return `u-${user.value.id}`
  let vid = localStorage.getItem(VISITOR_KEY)
  if (!vid) {
    vid = 'v-' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem(VISITOR_KEY, vid)
  }
  return vid
}

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(scopedKey(STORAGE_BASE))) || []
  } catch {
    return []
  }
}

const sessions = ref(load())
const currentId = ref(sessions.value[0]?.id ?? null)

// 是否正在生成（用于禁用输入框）
const generating = ref(false)
// 正在生成的那条助手消息，Home 页据此显示打字光标
const streamingMsg = ref(null)
// 当前请求的 AbortController，供 stopGenerating 中断流式生成
let currentController = null

// 用户主动打断 AI 生成：abort 后 difyChatStream 抛 AbortError，sendMessage catch 里标记为"已停止生成"
const stopGenerating = () => {
  if (currentController) {
    try { currentController.abort() } catch {}
  }
}

const persist = () => {
  localStorage.setItem(scopedKey(STORAGE_BASE), JSON.stringify(sessions.value))
  pushToServer(SERVER_TYPE, sessions.value)
}

// 启动时从服务端拉取会话
pullFromServer(SERVER_TYPE).then((serverSessions) => {
  if (Array.isArray(serverSessions)) {
    sessions.value = serverSessions
    if (!currentId.value && sessions.value.length) {
      currentId.value = sessions.value[0].id
    }
  }
})

const currentSession = computed(
  () => sessions.value.find((s) => s.id === currentId.value) || null
)

// 按日期分组：今天 / 昨天 / 更早
const groupedSessions = computed(() => {
  const groups = [
    { label: '今天', items: [] },
    { label: '昨天', items: [] },
    { label: '更早', items: [] },
  ]
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = today.getTime() - 86400000

  for (const s of sessions.value) {
    const t = s.createdAt
    if (t >= today.getTime()) groups[0].items.push(s)
    else if (t >= yesterday) groups[1].items.push(s)
    else groups[2].items.push(s)
  }
  return groups.filter((g) => g.items.length)
})

const newSession = () => {
  // 已停留在一个空会话上就不重复创建
  const cur = currentSession.value
  if (cur && cur.messages.length === 0) return cur.id
  // difyCid 为空：首轮发消息时 Dify 会创建新会话并回传 id
  const s = { id: Date.now(), difyCid: '', title: '新对话', messages: [], createdAt: Date.now() }
  sessions.value.unshift(s)
  currentId.value = s.id
  persist()
  return s.id
}

const selectSession = (id) => {
  currentId.value = id
}

const removeSession = (id) => {
  const idx = sessions.value.findIndex((s) => s.id === id)
  if (idx === -1) return
  sessions.value.splice(idx, 1)
  if (currentId.value === id) {
    currentId.value = sessions.value[0]?.id ?? null
  }
  persist()
}

// 每次发消息附带实时数据摘要（只拼进发给 Dify 的 query，页面气泡仍显示原文）
const buildDataTag = () => {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const hm = (min) => (min >= 60 ? `${Math.floor(min / 60)} 小时 ${min % 60} 分钟` : `${min} 分钟`)
  const lines = []
  // 今日计划完成情况
  const list = plansOn(ymd(now))
  if (list.length) lines.push(`今日计划 ${list.length} 条，已完成 ${list.filter((p) => isDoneOn(p, ymd(now))).length} 条`)
  // 专注记录
  const f = todayFocus.value
  const totalMin = Math.floor(focusSessions.value.reduce((sum, s) => sum + s.actualSec, 0) / 60)
  if (f.rounds || totalMin) lines.push(`今日专注 ${hm(f.minutes)}，累计专注 ${hm(totalMin)}`)
  // 最近一条心情日记（最多往前找 7 天）
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const diary = diaryState.value.diaries[ymd(d)]
    if (diary) {
      const m = moodOf(diary.mood)
      lines.push(`最近心情（${d.getMonth() + 1}月${d.getDate()}日）：${m ? m.label : '未记录'}`)
      break
    }
  }
  return lines.length ? `\n\n[实时数据] ${lines.join('；')}` : ''
}

const sendMessage = async (text, opts = {}) => {
  if (generating.value) return
  // 额度拦截：仅登录用户可用，每天 10 次用完即止（次日重置）
  if (!canUse.value) {
    const err = new Error('今日 AI 对话次数已用完，明天再来吧')
    err.code = 'AI_USAGE_EXHAUSTED'
    throw err
  }
  if (!currentSession.value) newSession()
  const s = currentSession.value

  // 前端拦截：请求生成超 30 天的计划直接礼貌拒绝，避免 Dify 输出超 token 截断乱码
  // 要求同时满足：动词（生成/帮我/做/安排/制定/规划）+ 数字+天 + 计划类关键词，避免误杀"3天前的计划"这类
  const planMatch = text.match(/(生成|帮我|做|安排|制定|规划|出|写).*?(\d{1,3})\s*天/)
  const dayNum = planMatch ? Number(planMatch[2]) : 0
  if (dayNum > 30 && /计划|安排|规划|日程|清单/.test(text)) {
    const attachFiles = opts.files || []
    s.messages.push({ role: 'user', content: text, files: attachFiles.length ? attachFiles.map((f) => ({ name: f.name })) : [] })
    if (s.messages.length === 1) s.title = text.slice(0, 18)
    s.messages.push({
      role: 'assistant',
      content: `${dayNum} 天有点长啦，心屿一次最多帮你规划 30 天。要不先做 30 天的？之后我们再接着续。`,
      sources: [],
    })
    persist()
    return
  }

  const query = `${text}${buildDataTag()}`
  const attachFiles = opts.files || []

  // 通过检查即扣减一次；若消息未送达 Dify（非用户主动停止），在 catch 中退还
  consume()

  s.messages.push({ role: 'user', content: text, files: attachFiles.length ? attachFiles.map((f) => ({ name: f.name })) : [] })
  // 第一条消息作为会话标题
  if (s.messages.length === 1) s.title = text.slice(0, 18)
  persist()

  // 先放一条空的助手消息，流式 token 不断往里追加
  const aiMsg = { role: 'assistant', content: '', sources: [], generating: true, error: false }
  s.messages.push(aiMsg)
  streamingMsg.value = aiMsg
  generating.value = true
  currentController = new AbortController()

  // 构造 Dify files 参数（document 类型）
  const difyFiles = attachFiles.length ? buildDifyFiles(attachFiles[0]) : []

  try {
    let result
    try {
      result = await difyChatStream({
        query,
        conversationId: s.difyCid || '',
        user: getDifyUser(),
        onToken: (piece) => {
          aiMsg.content += piece
        },
        files: difyFiles,
        signal: currentController.signal,
      })
    } catch (err) {
      // 旧会话的 conversation_id 在切换 Dify 应用后会失效：
      //   合法 UUID 但不存在 → 404 not_found / Conversation Not Exists
      //   格式非法           → 400 invalid_param
      // → 丢弃旧 ID，自动以全新会话重试一次
      if (!s.difyCid || !/404|not_found|invalid_param|Conversation Not Exists/i.test(err?.message || '')) throw err
      s.difyCid = ''
      aiMsg.content = ''
      persist()
      result = await difyChatStream({
        query,
        conversationId: '',
        user: getDifyUser(),
        onToken: (piece) => {
          aiMsg.content += piece
        },
        files: difyFiles,
        signal: currentController.signal,
      })
    }
    s.difyCid = result.conversationId || s.difyCid
    // 命中文档去重后作为"引用"展示
    const names = new Set()
    aiMsg.sources = result.sources
      .filter((r) => r.document_name && !names.has(r.document_name) && names.add(r.document_name))
      .map((r) => ({ name: r.document_name, content: r.content }))
    // 提取动作块（AI 建计划）：正文与动作分离，动作待用户确认后才写入
    const { text: cleanText, plans: actionPlans, malformed } = extractAction(aiMsg.content)
    aiMsg.content = cleanText
    if (actionPlans) {
      aiMsg.actionPlans = actionPlans
      aiMsg.actionStatus = 'pending' // pending -> created / dismissed
      aiMsg.actionSkipped = 0
    }
    // 动作块生成失败（碎片已清理）：提示用户可重试，正文为空时兜底也走这条
    if (malformed && !actionPlans) {
      const hint = '（计划这次没排出来，跟我说一声"重新生成"我再试一次）'
      aiMsg.content = aiMsg.content.trim() ? `${aiMsg.content.trim()}\n\n${hint}` : hint
    }
    if (!aiMsg.content.trim() && !actionPlans) {
      aiMsg.content = '（心屿沉默了一会儿，似乎在想该怎么说……你可以再和我多说一些吗？）'
    }
  } catch (err) {
    // 用户主动停止（消息已送达 Dify）不退费；连接/服务异常导致未送达，退还本次额度
    if (err?.name !== 'AbortError') refund()
    aiMsg.error = true
    aiMsg.content =
      err?.name === 'AbortError'
        ? '（已停止生成）'
        : `（连接心屿失败：${err?.message || '未知错误'}）`
  } finally {
    aiMsg.generating = false
    streamingMsg.value = null
    generating.value = false
    currentController = null
    persist()
  }
}

// 用户在确认卡片上点「全部创建」：写入 plansStore，已存在的同名同日计划自动跳过
const applyAction = (msg) => {
  if (!msg?.actionPlans || msg.actionStatus !== 'pending') return { created: 0, skipped: 0 }
  let created = 0
  let skipped = 0
  for (const p of msg.actionPlans) {
    const existed = plansOn(p.date).some((x) => x.title === p.title)
    if (existed) { skipped++; continue }
    addPlan({
      title: p.title,
      quadrant: p.quadrant,
      desc: p.desc || '',
      startTime: p.startTime || '',
      endTime: p.endTime || '',
      date: p.date,
      deadlineType: 'custom',
      customDate: p.deadline || p.date,
      repeat: p.repeat,
    })
    created++
  }
  msg.actionStatus = 'created'
  msg.actionSkipped = skipped
  persist()
  return { created, skipped }
}

// 用户点「取消」：不写入任何数据
const dismissAction = (msg) => {
  if (!msg || msg.actionStatus !== 'pending') return
  msg.actionStatus = 'dismissed'
  persist()
}

// 总结知识库文件：把文件作为 Dify document 附件发出，让 AI 阅读并总结
const summarizeFile = async (fileRecord) => {
  if (generating.value) return
  if (!fileRecord?.uploadFileId) throw new Error('文件尚未上传完成，无法总结')
  markSummarizing(fileRecord.id)
  try {
    await sendMessage(`请阅读并总结这份文件《${fileRecord.name}》的核心内容，分点提炼要点。`, {
      files: [fileRecord],
    })
    markSummarized(fileRecord.id)
  } catch (err) {
    markSummaryError(fileRecord.id, err?.message)
    throw err
  }
}

export function useChatSessions() {
  return {
    sessions,
    currentId,
    currentSession,
    groupedSessions,
    generating,
    streamingMsg,
    newSession,
    selectSession,
    removeSession,
    sendMessage,
    stopGenerating,
    summarizeFile,
    applyAction,
    dismissAction,
  }
}
