// AI 动作协议：心屿回复中可携带 xinyu-action 代码块，前端解析后由用户确认才真正写入
// 协议格式（由 Dify Agent 指令约束模型输出）：
//   ```xinyu-action
//   {"plans":[{"title":"...","quadrant":"important-not-urgent","date":"2026-09-16","repeat":"none"}]}
//   ```
// 本模块只做「提取 + 校验 + 清洗」，不执行任何写入。

export const ACTION_LANG = 'xinyu-action'
export const MAX_PLANS = 30

const QUADRANTS = [
  'important-urgent',
  'important-not-urgent',
  'urgent-not-important',
  'not-important-not-urgent',
]
const REPEAT_TYPES = ['none', 'daily', 'workday', 'weekly', 'monthly']

const pad = (n) => String(n).padStart(2, '0')
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
// 计划允许落在今天起 60 天内（覆盖 30 天计划留余量）
const maxDateStr = () => {
  const d = new Date()
  d.setDate(d.getDate() + 60)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const isValidDate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

// 简单 repeat 描述 -> plansStore 需要的完整 repeat 结构
const buildRepeat = (raw) => {
  const base = {
    type: 'none', interval: 1, weekdays: [1], monthMode: 'date',
    monthDays: [15], monthWeek: 0, monthDow: 1, endDate: '',
  }
  if (typeof raw === 'string' && REPEAT_TYPES.includes(raw)) {
    base.type = raw
    if (raw === 'workday') base.weekdays = [1, 2, 3, 4, 5]
    return base
  }
  // 也接受对象形式：{type:'weekly', weekdays:[1,3,5]}
  if (raw && typeof raw === 'object' && REPEAT_TYPES.includes(raw.type)) {
    base.type = raw.type
    if (raw.type === 'weekly') {
      const days = Array.isArray(raw.weekdays)
        ? raw.weekdays.map(Number).filter((n) => n >= 1 && n <= 7)
        : []
      base.weekdays = days.length ? [...new Set(days)].sort((a, b) => a - b) : [1]
    }
    if (raw.type === 'workday') base.weekdays = [1, 2, 3, 4, 5]
    if (Number.isInteger(raw.interval) && raw.interval >= 1) base.interval = Math.min(raw.interval, 31)
    return base
  }
  return base
}

const normalizePlan = (raw) => {
  if (!raw || typeof raw !== 'object') return null
  const title = String(raw.title || '').trim().slice(0, 50)
  if (!title) return null
  const quadrant = QUADRANTS.includes(raw.quadrant) ? raw.quadrant : 'important-not-urgent'
  const date = isValidDate(raw.date) && raw.date >= todayStr() && raw.date <= maxDateStr()
    ? raw.date
    : todayStr()
  // 截止日期 deadline（可选）：AI 对长期计划会输出，不早于 date
  let deadline = ''
  if (isValidDate(raw.deadline) && raw.deadline >= date && raw.deadline <= maxDateStr()) {
    deadline = raw.deadline
  }
  // 具体时间 HH:MM，startTime 可选；endTime 可空，且不早于 startTime
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/
  let startTime = ''
  let endTime = ''
  if (typeof raw.startTime === 'string' && hhmm.test(raw.startTime.trim())) {
    startTime = raw.startTime.trim()
  } else if (typeof raw.time === 'string' && hhmm.test(raw.time.trim())) {
    // 兼容旧协议字段 time
    startTime = raw.time.trim()
  }
  if (startTime && typeof raw.endTime === 'string' && hhmm.test(raw.endTime.trim()) && raw.endTime.trim() > startTime) {
    endTime = raw.endTime.trim()
  }
  const repeat = buildRepeat(raw.repeat)
  // repeat 对象里的 endDate：重复计划的结束日期（AI 对周期性长期计划输出）
  if (raw.repeat && typeof raw.repeat === 'object' && isValidDate(raw.repeat.endDate)) {
    repeat.endDate = raw.repeat.endDate
  }
  return {
    title,
    quadrant,
    date,
    deadline,
    startTime,
    endTime,
    repeat,
    desc: typeof raw.desc === 'string' ? raw.desc.trim().slice(0, 200) : '',
  }
}

// 把解析出的 data.plans 做校验、去重、限量，返回计划数组（非法返回 null）
const parsePlansData = (data) => {
  if (!data || !Array.isArray(data.plans)) return null
  const seen = new Set()
  const list = []
  for (const raw of data.plans) {
    const p = normalizePlan(raw)
    if (!p) continue
    const key = `${p.date}|${p.title}`
    if (seen.has(key)) continue
    seen.add(key)
    list.push(p)
    if (list.length >= MAX_PLANS) break
  }
  return list.length ? list : null
}

/**
 * 从助手回复全文提取动作
 * 优先识别 ```xinyu-action 围栏块；AI 漏写围栏时，兜底识别裸 {"plans":[...]} JSON
 * @param {string} fullText
 * @returns {{ text: string, plans: Array|null }}
 *   text  —— 去掉动作块后的正文（无变化则原样返回）
 *   plans —— 校验通过的计划数组；没有合法动作块时为 null
 */
export function extractAction(fullText) {
  if (!fullText || typeof fullText !== 'string') return { text: fullText || '', plans: null }
  let plans = null
  let text = fullText

  // 1) 标准：```xinyu-action ... ``` 围栏块（只接受第一个合法块）
  const fencedRe = new RegExp('```' + ACTION_LANG + '\\s*([\\s\\S]*?)```', 'gi')
  text = text.replace(fencedRe, (_, body) => {
    if (plans) return ''
    let data
    try {
      data = JSON.parse(body.trim())
    } catch {
      return '' // JSON 非法：动作块静默移除，不干扰正文对话
    }
    const list = parsePlansData(data)
    if (list) plans = list
    return ''
  })

  // 2) 兜底：没有围栏但正文里直接出现了 {"plans":[...]} 裸 JSON
  if (!plans) {
    const bareRe = /\{"plans"\s*:\s*\[[\s\S]*?\]\s*\}/i
    text = text.replace(bareRe, (block) => {
      let data
      try {
        data = JSON.parse(block.trim())
      } catch {
        return block // 解析不了就原样保留，避免误伤正文
      }
      const list = parsePlansData(data)
      if (list) {
        plans = list
        return ''
      }
      return block
    })
  }

  // 3) 清理 AI 输出失败时的破损碎片（没有合法 JSON 可解析，只别让垃圾显示给用户）
  let malformed = false
  // A. 开围栏完整但一直没有闭合：从 ```xinyu-action 到结尾整段丢弃
  const dangling = new RegExp('```' + ACTION_LANG + '[\\s\\S]*$', 'i')
  if (dangling.test(text)) { text = text.replace(dangling, ''); malformed = true }
  // B. 语言标签漏了开头反引号、结尾只剩 1-2 个反引号（如 "xinyu-action\n\n1\n\n``"）
  const broken = new RegExp('`{0,3}' + ACTION_LANG + '`{0,3}[\\s\\S]*?`{1,2}(?:\\s|$)', 'i')
  if (broken.test(text)) { text = text.replace(broken, ''); malformed = true }
  // C. 残留的单独成行的语言标签 / 只有反引号的行
  const soloTag = new RegExp('^[ \\t]*`{0,3}' + ACTION_LANG + '`{0,3}[ \\t]*$', 'gim')
  if (soloTag.test(text)) { text = text.replace(soloTag, ''); malformed = true }
  if (/^[ \t]*`{1,2}[ \t]*$/m.test(text)) { text = text.replace(/^[ \t]*`{1,2}[ \t]*$/gm, ''); malformed = true }

  return { text: text.replace(/\n{3,}/g, '\n\n').trim(), plans, malformed }
}

/**
 * 气泡展示文本：流已结束走 extractAction；流未结束时动作块可能尚未闭合，
 * 从开围栏处整体截断，避免模型生成 JSON 的几秒钟里用户看到原始代码
 */
export function displayFor(fullText, generating = false) {
  const { text } = extractAction(fullText)
  if (!generating) return text
  // 生成中：从围栏开头，或裸 {"plans" 开头处截断，避免 JSON 闪现
  const fenceIdx = text.indexOf('```' + ACTION_LANG)
  const bareIdx = text.search(/\{"plans"\s*:/i)
  let cut = -1
  if (fenceIdx >= 0 && bareIdx >= 0) cut = Math.min(fenceIdx, bareIdx)
  else cut = fenceIdx >= 0 ? fenceIdx : bareIdx
  return (cut >= 0 ? text.slice(0, cut) : text).replace(/\n{3,}/g, '\n\n').trimEnd()
}
