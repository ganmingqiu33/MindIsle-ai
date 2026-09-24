import { ref } from 'vue'
import { scopedKey } from '@/utils/storageScope'
import { pullFromServer, pushToServer } from '@/utils/serverSync'

/* ============================================================
 * 计划数据 · 模块级单例（时间计划页 / 仪表盘共享同一份状态）
 * 持久化到 localStorage（按账号隔离）+ 服务端 user_data 表
 * ============================================================ */

const STORAGE_BASE = 'xinyu-plans'
const SERVER_TYPE = 'plans'
let planSeq = 1000

/* ---------- 日期工具 ---------- */
const pad = (n) => String(n).padStart(2, '0')
export const fmtDate = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`
export const parseDate = (s) => {
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const mkDate = (offset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return fmtDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
}
// 周一 = 1 ... 周日 = 7
export const dow1 = (dt) => (dt.getDay() + 6) % 7 + 1

/* ---------- 象限常量 ---------- */
export const quadrantColors = {
  'urgent-not-important': '#FBBC04',
  'important-urgent': '#EA4335',
  'not-important-not-urgent': '#34A853',
  'important-not-urgent': '#1A73E8',
}
export const quadrantLabel = {
  'urgent-not-important': '紧急不重要',
  'important-urgent': '重要且紧急',
  'not-important-not-urgent': '不重要不紧急',
  'important-not-urgent': '重要不紧急',
}

/* ---------- Mock 初始数据 ---------- */
const emptyRepeat = () => ({
  type: 'none', interval: 1, weekdays: [1], monthMode: 'date',
  monthDays: [15], monthWeek: 0, monthDow: 1, endDate: '',
})
const seedPlans = () => [
  {
    id: 1, title: '学习技能，听课', quadrant: 'important-urgent', done: false,
    desc: '晚上 8 点跟着课程学完第三章，边听边记笔记，课后整理三个要点。',
    deadlineType: 'today', customDate: '', overdueAction: 'none',
    repeat: { type: 'daily', interval: 1, weekdays: [1], monthMode: 'date', monthDays: [15], monthWeek: 0, monthDow: 1, endDate: '' },
    date: mkDate(0), skipDates: [],
  },
  {
    id: 2, title: '洗漱', quadrant: 'not-important-not-urgent', done: true,
    desc: '', deadlineType: 'today', customDate: '', overdueAction: 'none',
    repeat: { type: 'workday', interval: 1, weekdays: [1, 2, 3, 4, 5], monthMode: 'date', monthDays: [15], monthWeek: 0, monthDow: 1, endDate: '' },
    date: mkDate(0), skipDates: [],
  },
  {
    id: 3, title: '回复项目邮件', quadrant: 'urgent-not-important', done: false,
    desc: '', deadlineType: 'today', customDate: '', overdueAction: 'none',
    repeat: emptyRepeat(), date: mkDate(0), skipDates: [],
  },
  {
    id: 4, title: '读书 30 页', quadrant: 'important-not-urgent', done: false,
    desc: '心理学导论第二章，读到"归因偏差"那一节。',
    deadlineType: 'week', customDate: '', overdueAction: 'postpone',
    repeat: { type: 'weekly', interval: 1, weekdays: [2, 4], monthMode: 'date', monthDays: [15], monthWeek: 0, monthDow: 1, endDate: '' },
    date: mkDate(2), skipDates: [],
  },
  {
    id: 5, title: '健身训练', quadrant: 'important-not-urgent', done: false,
    desc: '', deadlineType: 'week', customDate: '', overdueAction: 'none',
    repeat: { type: 'weekly', interval: 1, weekdays: [1, 3, 5], monthMode: 'date', monthDays: [15], monthWeek: 0, monthDow: 1, endDate: '' },
    date: mkDate(3), skipDates: [],
  },
  {
    id: 6, title: '月度复盘', quadrant: 'urgent-not-important', done: false,
    desc: '', deadlineType: 'custom', customDate: mkDate(5), overdueAction: 'none',
    repeat: { type: 'monthly', interval: 1, weekdays: [1], monthMode: 'date', monthDays: [20], monthWeek: 0, monthDow: 1, endDate: '' },
    date: mkDate(5), skipDates: [],
  },
]

/* ---------- 载入 / 持久化 ---------- */
// 是否为重复计划（每天的实例互相独立，完成状态需按日期记录）
export const isRepeatPlan = (p) => !!p && !!p.repeat && p.repeat.type !== 'none'
// 旧版单时间字段 time -> startTime；旧版重复计划共用单个 done -> 按日期拆分
const migratePlan = (p) => {
  if (!p) return p
  if (p.startTime === undefined && p.time) p.startTime = p.time
  delete p.time
  if (!Array.isArray(p.doneDates)) p.doneDates = []
  if (isRepeatPlan(p)) {
    // 旧数据里重复计划只有一个 done（勾选后所有日期都完成）：迁移为「今天这一次已完成」，明天起重新待办
    if (p.done && !p.doneDates.includes(mkDate(0))) p.doneDates.push(mkDate(0))
    p.done = false
  }
  return p
}
const load = () => {
  try {
    const raw = localStorage.getItem(scopedKey(STORAGE_BASE))
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length) {
        planSeq = arr.reduce((mx, p) => Math.max(mx, p.id || 0), 1000) + 1
        return arr.map(migratePlan)
      }
    }
  } catch {}
  // 新用户无数据时返回空数组（不再注入 mock 种子计划）
  return []
}

const plans = ref(load())
export { plans }

const persist = () => {
  try { localStorage.setItem(scopedKey(STORAGE_BASE), JSON.stringify(plans.value)) } catch {}
  pushToServer(SERVER_TYPE, plans.value)
}

// 启动时从服务端拉取（有则覆盖本地）
pullFromServer(SERVER_TYPE).then((serverPlans) => {
  if (Array.isArray(serverPlans) && serverPlans.length) {
    plans.value = serverPlans.map(migratePlan)
    planSeq = serverPlans.reduce((mx, p) => Math.max(mx, p.id || 0), 1000) + 1
  }
})

/* ---------- 日期判定（支持重复规则 + 单次跳过） ---------- */
export const planOnDate = (p, dateStr) => {
  if (p.skipDates?.includes(dateStr)) return false
  const d = parseDate(dateStr)
  const start = parseDate(p.date)
  if (d < start) return false
  if (p.repeat.endDate && d > parseDate(p.repeat.endDate)) return false

  const diffDays = Math.round((d - start) / 86400000)
  switch (p.repeat.type) {
    case 'none':
      return dateStr === p.date
    case 'daily':
      return diffDays % (p.repeat.interval || 1) === 0
    case 'workday':
      return [1, 2, 3, 4, 5].includes(dow1(d))
    case 'weekly':
      return p.repeat.weekdays.includes(dow1(d))
    case 'monthly':
      if (p.repeat.monthMode === 'date') return p.repeat.monthDays.includes(d.getDate())
      if (dow1(d) !== p.repeat.monthDow) return false
      const weekOfMonth = Math.ceil(d.getDate() / 7)
      if (p.repeat.monthWeek === 4) {
        return d.getDate() + 7 > new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      }
      return weekOfMonth === p.repeat.monthWeek + 1
    default:
      return dateStr === p.date
  }
}

/* ---------- 查询 ---------- */
export const plansOn = (dateStr) => plans.value.filter((p) => planOnDate(p, dateStr))

/* ---------- 完成计划分布环口径（今日/最近7天/历史累积，仪表盘与统计页共享并持久化） ---------- */
const DIST_SCOPE_BASE = 'xinyu-dist-scope'
const DIST_SCOPE_SERVER = 'dist-scope'
const DIST_SCOPES = ['today', 'week', 'history']
const loadDistScope = () => {
  try {
    const v = localStorage.getItem(scopedKey(DIST_SCOPE_BASE))
    return DIST_SCOPES.includes(v) ? v : 'history'
  } catch {
    return 'history'
  }
}
const distScope = ref(loadDistScope())
const setDistScope = (v) => {
  if (!DIST_SCOPES.includes(v)) return
  distScope.value = v
  try { localStorage.setItem(scopedKey(DIST_SCOPE_BASE), v) } catch {}
  pushToServer(DIST_SCOPE_SERVER, v)
}
export { distScope, setDistScope }

// 启动时拉取 dist-scope
pullFromServer(DIST_SCOPE_SERVER).then((v) => {
  if (DIST_SCOPES.includes(v)) distScope.value = v
})

/* ---------- 变更操作 ---------- */
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
export const addPlan = (data) => {
  const startTime = HHMM.test(data.startTime || '') ? data.startTime : ''
  // 结束时间必须是合法时刻且晚于开始时间
  const endTime = startTime && HHMM.test(data.endTime || '') && data.endTime > startTime ? data.endTime : ''
  const plan = {
    id: planSeq++,
    title: data.title || '未命名计划',
    quadrant: data.quadrant || 'urgent-not-important',
    done: false,
    doneDates: Array.isArray(data.doneDates) ? data.doneDates.slice() : [],
    desc: data.desc || '',
    startTime,
    endTime,
    deadlineType: data.deadlineType || 'today',
    customDate: data.customDate || '',
    overdueAction: data.overdueAction || 'none',
    repeat: data.repeat || emptyRepeat(),
    date: data.date || mkDate(0),
    skipDates: [],
  }
  plans.value.push(plan)
  persist()
  return plan
}

export const removePlan = (id) => {
  plans.value = plans.value.filter((p) => p.id !== id)
  persist()
}

/* ---------- 完成状态 ----------
 * 非重复计划：单个 done；
 * 重复计划：doneDates 按日期记录（YYYY-MM-DD），勾今天不影响明天。
 */
export const isDoneOn = (p, dateStr) => {
  if (!p) return false
  if (isRepeatPlan(p)) return !!p.doneDates?.includes(dateStr)
  return !!p.done
}
// 历史口径：重复计划只要任意一天完成过，就算「完成过的计划」
export const hasEverDone = (p) => {
  if (!p) return false
  if (isRepeatPlan(p)) return (p.doneDates?.length || 0) > 0
  return !!p.done
}

export const toggleDone = (idOrPlan, dateStr) => {
  const p = typeof idOrPlan === 'object' ? idOrPlan : plans.value.find((x) => x.id === idOrPlan)
  if (!p) return
  if (isRepeatPlan(p)) {
    const day = dateStr || p.date
    if (!Array.isArray(p.doneDates)) p.doneDates = []
    const i = p.doneDates.indexOf(day)
    if (i >= 0) p.doneDates.splice(i, 1)
    else p.doneDates.push(day)
  } else {
    p.done = !p.done
  }
  persist()
}

export const savePlans = () => persist()

export function usePlans() {
  return {
    plans,
    plansOn,
    planOnDate,
    addPlan,
    removePlan,
    toggleDone,
    isDoneOn,
    hasEverDone,
    savePlans,
  }
}
