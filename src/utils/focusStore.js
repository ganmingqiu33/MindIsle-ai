import { ref, reactive, computed } from 'vue'
import { scopedKey } from '@/utils/storageScope'
import { pullFromServer, pushToServer } from '@/utils/serverSync'

/* ============================================================
 * 专注记录 · 模块级单例
 *  - sessions：历史专注记录，localStorage + 服务端持久化
 *  - timerState：当前计时运行态，跨路由切换 / 刷新持续走时
 *    （时间戳驱动：只存 endAt，恢复时用 Date.now() 重算剩余）
 * session: { id, date(YYYY-MM-DD), plannedMin, actualSec,
 *            completed, taskId, taskTitle, startedAt, endedAt }
 * ============================================================ */

const STORAGE_BASE = 'xinyu-focus'
const SERVER_TYPE = 'focus'
const RUNTIME_BASE = 'xinyu-focus-runtime'
const MIN_RECORD_SEC = 180   // 不足 3 分钟不计入记录
let seq = 5000

const ymd = (ts) => {
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/* ---------------- 历史记录 ---------------- */
const loadSessions = () => {
  try {
    const raw = localStorage.getItem(scopedKey(STORAGE_BASE))
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) {
        seq = arr.reduce((mx, s) => Math.max(mx, s.id || 0), 5000) + 1
        return arr
      }
    }
  } catch {}
  return []
}

export const sessions = ref(loadSessions())
const persistSessions = () => {
  try { localStorage.setItem(scopedKey(STORAGE_BASE), JSON.stringify(sessions.value)) } catch {}
  pushToServer(SERVER_TYPE, sessions.value)
}

// 启动时从服务端拉取历史记录
pullFromServer(SERVER_TYPE).then((serverSessions) => {
  if (Array.isArray(serverSessions)) {
    sessions.value = serverSessions
    seq = serverSessions.reduce((mx, s) => Math.max(mx, s.id || 0), 5000) + 1
  }
})

export const addSession = (data) => {
  const now = Date.now()
  const s = {
    id: seq++,
    date: data.date || ymd(now),
    plannedMin: data.plannedMin || 25,
    actualSec: Math.round(data.actualSec || 0),
    completed: !!data.completed,
    taskId: data.taskId ?? null,
    taskTitle: data.taskTitle || '',
    startedAt: data.startedAt || now,
    endedAt: data.endedAt || now,
  }
  sessions.value.push(s)
  persistSessions()
  return s
}

export const removeSession = (id) => {
  sessions.value = sessions.value.filter((s) => s.id !== id)
  persistSessions()
}

export const sessionsOn = (date) => sessions.value.filter((s) => s.date === date)

export const todayFocus = computed(() => {
  const today = ymd(Date.now())
  const list = sessions.value.filter((s) => s.date === today)
  const totalSec = list.reduce((sum, s) => sum + s.actualSec, 0)
  return {
    list,
    rounds: list.length,
    totalSec,
    minutes: Math.floor(totalSec / 60),
  }
})

export const focusSecOn = (date) =>
  sessions.value.filter((s) => s.date === date).reduce((sum, s) => sum + s.actualSec, 0)

/* ---------------- 运行态计时器（跨页面常驻） ---------------- */
const defaultRuntime = () => ({
  phase: 'idle',          // idle | running | paused | done
  minutes: 25,
  remainingSec: 25 * 60,
  endAt: 0,
  startedAt: 0,
  taskId: null,
  taskTitle: '',
})

const loadRuntime = () => {
  try {
    const raw = localStorage.getItem(scopedKey(RUNTIME_BASE))
    if (raw) return { ...defaultRuntime(), ...JSON.parse(raw) }
  } catch {}
  return defaultRuntime()
}

export const timerState = reactive(loadRuntime())

/* 完成提示信号：模块级单例，任意页面可 watch，到点完成时递增 */
export const doneSignal = ref(0)
export const lastDoneInfo = ref({ plannedMin: 0, taskTitle: '' })

const persistRuntime = () => {
  try {
    localStorage.setItem(scopedKey(RUNTIME_BASE), JSON.stringify({
      phase: timerState.phase,
      minutes: timerState.minutes,
      remainingSec: timerState.remainingSec,
      endAt: timerState.endAt,
      startedAt: timerState.startedAt,
      taskId: timerState.taskId,
      taskTitle: timerState.taskTitle,
    }))
  } catch {}
}

/* 完成提示音（两音风铃，不依赖任何组件生命周期） */
let audioCtx = null
const ensureCtx = () => {
  if (typeof window === 'undefined') return null
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}
const playChime = () => {
  const ctx = ensureCtx()
  if (!ctx) return
  ;[880, 1318.5].forEach((f, i) => {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = f
    const t = ctx.currentTime + i * 0.28
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.35, t + 0.03)
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.4)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(t); osc.stop(t + 1.6)
  })
}

/* 落库一条记录（防重复由 phase 流转保证） */
const recordIfEnough = (completed) => {
  const actualSec = completed
    ? timerState.minutes * 60
    : timerState.minutes * 60 - timerState.remainingSec
  if (actualSec < MIN_RECORD_SEC) return
  addSession({
    plannedMin: timerState.minutes,
    actualSec,
    completed,
    taskId: timerState.taskId,
    taskTitle: timerState.taskTitle,
    startedAt: timerState.startedAt,
  })
}

/* 完成 / 到点 */
const completeFocus = () => {
  timerState.phase = 'done'
  timerState.remainingSec = 0
  timerState.endAt = 0
  recordIfEnough(true)
  lastDoneInfo.value = {
    plannedMin: timerState.minutes,
    taskTitle: timerState.taskTitle,
  }
  doneSignal.value++
  persistRuntime()
  playChime()
}

/* 常驻心跳：模块只初始化一次，路由切换不受影响 */
setInterval(() => {
  if (timerState.phase !== 'running') return
  const left = Math.round((timerState.endAt - Date.now()) / 1000)
  if (left <= 0) {
    completeFocus()
  } else {
    timerState.remainingSec = left
  }
}, 500)

/* ---------- 对外操作 ---------- */
/* idle / done 态调整时长 */
export const setFocusMinutes = (m) => {
  if (timerState.phase !== 'idle' && timerState.phase !== 'done') return
  if (!Number.isFinite(m) || m < 3) return
  timerState.minutes = m
  timerState.remainingSec = m * 60
  persistRuntime()
}

/* idle / done 态预选专注计划 / 自定义名字（跨页面保留） */
export const setTaskSelection = (taskId, taskTitle) => {
  if (timerState.phase !== 'idle' && timerState.phase !== 'done') return
  timerState.taskId = taskId
  timerState.taskTitle = taskTitle
  persistRuntime()
}

export const startFocus = ({ taskId = null, taskTitle = '' } = {}) => {
  // minutes 异常时回退默认 25 分钟，避免 00:00
  if (!Number.isFinite(timerState.minutes) || timerState.minutes < 3) {
    timerState.minutes = 25
  }
  // done 态开启下一轮：重置为完整时长
  if (timerState.phase === 'done' || timerState.remainingSec <= 0) {
    timerState.remainingSec = timerState.minutes * 60
  }
  timerState.phase = 'running'
  timerState.taskId = taskId
  timerState.taskTitle = taskTitle
  timerState.startedAt = Date.now() - (timerState.minutes * 60 - timerState.remainingSec) * 1000
  timerState.endAt = Date.now() + timerState.remainingSec * 1000
  persistRuntime()
}

export const pauseFocus = () => {
  if (timerState.phase !== 'running') return
  timerState.remainingSec = Math.max(1, Math.round((timerState.endAt - Date.now()) / 1000))
  timerState.phase = 'paused'
  timerState.endAt = 0
  persistRuntime()
}

export const resumeFocus = () => {
  if (timerState.phase !== 'paused') return
  timerState.phase = 'running'
  timerState.endAt = Date.now() + timerState.remainingSec * 1000
  persistRuntime()
}

/* 提前结束：不足 3 分钟不记录 */
export const endFocusEarly = () => {
  const planned = timerState.minutes * 60
  if (timerState.remainingSec < planned) recordIfEnough(false)
  timerState.phase = 'idle'
  timerState.remainingSec = planned
  timerState.endAt = 0
  timerState.startedAt = 0
  timerState.taskId = null
  timerState.taskTitle = ''
  persistRuntime()
}

/* 模块加载时恢复运行态：running 且已到点 → 直接结算 */
if (timerState.phase === 'running' && timerState.endAt) {
  if (Date.now() >= timerState.endAt) {
    completeFocus()
  }
  // 未到点则由常驻心跳继续走时（endAt 仍是未来时间戳）
}

export function useFocus() {
  return {
    sessions,
    addSession,
    removeSession,
    sessionsOn,
    todayFocus,
    focusSecOn,
    timerState,
    setFocusMinutes,
    startFocus,
    pauseFocus,
    resumeFocus,
    endFocusEarly,
  }
}
