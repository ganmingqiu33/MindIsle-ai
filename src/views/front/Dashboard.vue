<template>
  <div ref="rootRef" class="dash">
    <!-- ① 问候大卡（整色卡，随时间段变色 + 鼠标 3D 倾斜） -->
    <div
      class="hero reveal"
      :class="`hero-${greeting.tone}`"
      ref="heroRef"
      @mousemove="onTilt"
      @mouseleave="resetTilt"
    >
      <div class="hero-left">
        <h1 class="hero-title">{{ greeting.word }}，{{ displayName }}</h1>
        <p class="hero-sub">千里之行，始于足下。你正在向目标前进，继续努力吧！</p>
      </div>
      <div class="hero-date">{{ dateText }}</div>
      
      <!-- 装饰几何 -->
      <span class="hero-shape s-circle" aria-hidden="true"></span>
      <span class="hero-shape s-tri" aria-hidden="true"></span>
    </div>

    <!-- ② 今日任务 -->
    <KitCard class="reveal cell cell-tasks">
      <header class="cell-head">
        <h2><KitIcon name="plans" :size="20" /> 今日任务</h2>
        <button class="link" @click="router.push('/front/plans')">＋ 新建</button>
      </header>
      <div class="progress-row">
        <div class="progress-track"><div class="progress-fill" :style="{ width: taskPercent + '%' }"></div></div>
        <span class="progress-num">{{ doneCount }}/{{ todayPlans.length }} · {{ taskPercent }}%</span>
      </div>
      <div v-if="todayPlans.length" class="task-list">
        <button
          v-for="p in todayPlans.slice(0, 5)"
          :key="p.id"
          class="task-line"
          :class="{ done: isDoneToday(p) }"
          @click="goTask(p)"
        >
          <span
            class="task-chk"
            :class="{ checked: isDoneToday(p) }"
            :style="isDoneToday(p) ? { background: quadrantColors[p.quadrant], borderColor: quadrantColors[p.quadrant] } : { borderColor: quadrantColors[p.quadrant] }"
            @click.stop="toggleDone(p, todayKey)"
          >
            <svg v-if="isDoneToday(p)" viewBox="0 0 12 12" width="8" height="8"><path d="M2 6.5L4.5 9L10 3" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <span class="task-name">{{ p.title }}</span>
        </button>
        <p v-if="todayPlans.length > 5" class="task-more" @click="router.push('/front/plans')">
          还有 {{ todayPlans.length - 5 }} 条，查看全部 ›
        </p>
      </div>
      <p v-else class="empty-line">今天还没有任务，去时间计划里安排第一件事吧。</p>
      <button class="link center-link" @click="router.push('/front/plans')">查看全部 ›</button>
    </KitCard>

    <!-- ④ 今日专注（与专注页数据/计时联动） -->
    <KitCard class="reveal cell cell-focus">
      <header class="cell-head">
        <h2><KitIcon name="focus" :size="20" /> 今日专注</h2>
      </header>
      <div class="focus-row">
        <div>
          <div class="big-num">{{ focusHM }}</div>
          <div class="sub-line">
            <span v-if="focusRunning" class="focus-live"><i class="live-dot"></i>专注中 {{ focusCountdown }}</span>
            <span v-else>{{ todayFocus.rounds }} 轮</span>
          </div>
        </div>
        <KitButton variant="solid" color="yellow" :pill="false" class="focus-btn" @click="router.push('/front/focus')">
          {{ focusRunning ? '继续 ›' : '▷ 开始专注' }}
        </KitButton>
      </div>
    </KitCard>

    <!-- ⑤ 今日心情（与心情日记数据联动） -->
    <KitCard class="reveal cell cell-mood">
      <header class="cell-head">
        <h2><span class="mood-ico">☺</span> 今日心情</h2>
        <button class="link red" @click="router.push('/front/diary')">{{ todayDiary ? '日记 ›' : '＋ 写日记' }}</button>
      </header>
      <div class="moods">
        <button
          v-for="m in moods"
          :key="m.key"
          class="mood-item"
          :class="{ active: todayDiary?.mood === m.key }"
          :style="todayDiary?.mood === m.key ? { background: m.color + '22', borderColor: m.color } : {}"
          @click="router.push('/front/diary')"
        >
          <span class="mood-emoji">{{ m.emoji }}</span>
          <span class="mood-label">{{ m.label }}</span>
        </button>
      </div>
      <p v-if="todayDiary" class="mood-preview">{{ truncate(todayDiary.content, 46) }}</p>
      <p v-else class="empty-line">不急着定义情绪，先用几句话把它轻轻放在这里。</p>
    </KitCard>

    <!-- ⑥ 心屿 AI（显示最近聊天记录，点击进入聊天） -->
    <KitCard class="reveal cell cell-ai" @click="router.push('/front/ai')">
      <header class="cell-head">
        <h2><span class="ai-dot"></span> 心屿 AI</h2>
        <button class="link" @click.stop="router.push('/front/ai')">打开 ›</button>
      </header>
      <div class="ai-preview">
        <div v-if="lastAIMessages.length" class="ai-chat">
          <div v-for="(msg, i) in lastAIMessages" :key="i" class="ai-msg" :class="msg.role">
            <span class="ai-role">{{ msg.role === 'user' ? '你' : '心屿' }}</span>
            <span class="ai-text">{{ truncate(msg.content, 40) }}</span>
          </div>
        </div>
        <div v-else class="ai-empty">
          <span class="ai-welcome">💭 和心屿聊聊吧</span>
          <span class="ai-hint">点击进入 AI 聊天 →</span>
        </div>
      </div>
    </KitCard>

    <!-- ⑦ 本周专注趋势（点击直达数据分析 · 专注） -->
    <KitCard class="reveal cell cell-trend cell-trend-link" @click="router.push('/front/stats?tab=focus')">
      <header class="cell-head">
        <h2>↗ 本周专注趋势</h2>
        <button class="link">详情 ›</button>
      </header>
      <div ref="chartRef" class="chart"></div>
    </KitCard>

    <!-- ⑧ 完成计划优先级分布（迷你环，与数据分析页同源，口径可切换） -->
    <KitCard class="reveal cell cell-recent cell-dist" @click="router.push(`/front/stats?tab=plans&scope=${distScope}`)">
      <header class="cell-head">
        <h2><span class="rec-ico">◎</span> 完成计划分布</h2>
        <button class="link">详情 ›</button>
      </header>
      <div class="mini-scope" @click.stop>
        <button :class="{ active: distScope === 'today' }" @click="setDistScope('today')">今日</button>
        <button :class="{ active: distScope === 'week' }" @click="setDistScope('week')">7 天</button>
        <button :class="{ active: distScope === 'history' }" @click="setDistScope('history')">累积</button>
      </div>
      <div class="mini-dist">
        <div class="mini-donut-wrap">
          <svg viewBox="0 0 120 120" class="mini-donut">
            <circle cx="60" cy="60" r="46" fill="none" stroke="#EFEFEF" stroke-width="15" />
            <circle
              v-for="seg in miniDonutSegs"
              :key="seg.key"
              cx="60" cy="60" r="46" fill="none"
              :stroke="seg.color" stroke-width="15"
              :stroke-dasharray="`${seg.len - 1.5} ${MINI_RING_C - seg.len + 1.5}`"
              :stroke-dashoffset="-seg.acc"
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div class="mini-donut-center">
            <strong>{{ donePlansCount }}</strong>
            <span>已完成</span>
          </div>
        </div>
        <ul class="mini-legend">
          <li v-for="q in miniQuadrantStats" :key="q.key">
            <span class="ml-dot" :style="{ background: q.color }"></span>
            <span class="ml-name">{{ q.short }}</span>
            <span class="ml-val">{{ q.count }}</span>
          </li>
        </ul>
      </div>
    </KitCard>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import KitCard from '@/components/front/KitCard.vue'
import KitButton from '@/components/front/KitButton.vue'
import KitIcon from '@/components/front/KitIcon.vue'
import { useReveal } from '@/composables/useReveal'
import { useFrontAuth } from '@/utils/frontAuth'
import { useChatSessions } from '@/utils/chatStore'
import { usePlans, plansOn, mkDate, quadrantColors, quadrantLabel, distScope, setDistScope, isDoneOn, hasEverDone } from '@/utils/plansStore'
import { MOODS, getDiary } from '@/utils/diaryStore'
import { todayFocus, timerState as focusTimer, sessions as focusSessions } from '@/utils/focusStore'
import { isDark } from '@/utils/theme'

const router = useRouter()
const { root: rootRef } = useReveal()
const { user } = useFrontAuth()
const { currentSession } = useChatSessions()
const { plans, toggleDone } = usePlans()

// 完成计划优先级分布（迷你环，与数据分析页同源，口径跨页共享持久化）
const DIST_QUADRANT_KEYS = [
  'important-urgent',
  'important-not-urgent',
  'urgent-not-important',
  'not-important-not-urgent',
]
const scopedDonePlans = computed(() => {
  if (distScope.value === 'today') return plansOn(todayKey).filter((p) => isDoneOn(p, todayKey))
  if (distScope.value === 'week') {
    const map = new Map()
    for (let i = -6; i <= 0; i++) {
      const day = mkDate(i)
      for (const p of plansOn(day)) {
        if (isDoneOn(p, day) && !map.has(p.id)) map.set(p.id, p)
      }
    }
    return [...map.values()]
  }
  return plans.value.filter((p) => hasEverDone(p))
})
const donePlansCount = computed(() => scopedDonePlans.value.length)
const miniQuadrantStats = computed(() =>
  DIST_QUADRANT_KEYS.map((key) => ({
    key,
    short: quadrantLabel[key],
    color: quadrantColors[key],
    count: scopedDonePlans.value.filter((p) => p.quadrant === key).length,
  }))
)
const MINI_RING_C = 2 * Math.PI * 46
const miniDonutSegs = computed(() => {
  const total = donePlansCount.value || 1
  let acc = 0
  return miniQuadrantStats.value
    .filter((q) => q.count > 0)
    .map((q) => {
      const seg = { ...q, acc, len: (q.count / total) * MINI_RING_C }
      acc += seg.len
      return seg
    })
})

// 今日任务（与时间计划页共享同一份数据；重复计划今天完成不影响明天）
const todayKey = mkDate(0)
const isDoneToday = (p) => isDoneOn(p, todayKey)
const todayPlans = computed(() => plansOn(todayKey))
const doneCount = computed(() => todayPlans.value.filter(isDoneToday).length)
const taskPercent = computed(() =>
  todayPlans.value.length ? Math.round((doneCount.value / todayPlans.value.length) * 100) : 0
)
const goTask = () => router.push('/front/plans')

const displayName = computed(() => user.value?.nickname || user.value?.email || '朋友')

// 问候语 + 整卡色调（早黄 / 午蓝 / 晚红）
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h >= 5 && h < 11) return { word: '早上好', tone: 'yellow' }
  if (h >= 11 && h < 14) return { word: '中午好', tone: 'blue' }
  if (h >= 14 && h < 18) return { word: '下午好', tone: 'blue' }
  return { word: '晚上好', tone: 'red' }
})

const dateText = computed(() => {
  const d = new Date()
  const week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日 · ${week}`
})

const quicks = [
  { label: '任务', to: '/front/plans' },
  { label: '日程', to: '/front/plans' },
  { label: '专注', to: '/front/focus' },
]

const moods = MOODS
// 今日心情：读取心情日记数据（diaryStore 模块级单例，保存后仪表盘实时联动）
const todayDiary = computed(() => getDiary(mkDate(0)))

// 今日专注：真实记录 + 跨页面常驻的计时状态
const focusHM = computed(() => {
  const m = Math.floor(todayFocus.value.totalSec / 60)
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
})
const focusRunning = computed(() => focusTimer.phase === 'running' || focusTimer.phase === 'paused')
const focusCountdown = computed(() => {
  const s = Math.max(0, focusTimer.remainingSec)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
})

const comingSoon = () => ElMessage.info('这个功能马上就来，先期待一下～')

// 心屿 AI 卡：取当前会话最近 4 条非空消息
const lastAIMessages = computed(() => {
  const msgs = currentSession.value?.messages || []
  return msgs.slice(-4).filter((m) => m.content)
})
const truncate = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s)

// 问候卡鼠标 3D 倾斜（±3°）
const heroRef = ref(null)
const onTilt = (e) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const el = heroRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const rx = ((e.clientY - r.top) / r.height - 0.5) * -6
  const ry = ((e.clientX - r.left) / r.width - 0.5) * 6
  el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`
}
const resetTilt = () => {
  if (heroRef.value) heroRef.value.style.transform = ''
}

// ECharts：本周专注分钟柱图（墨线描边黄柱，数据与专注记录同源）
const chartRef = ref(null)
let chart = null
// 周一为本周起点，按日汇总实际专注分钟
const weekFocusMin = computed(() => {
  const now = new Date()
  const back = (now.getDay() + 6) % 7
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back)
  const p = (n) => String(n).padStart(2, '0')
  const keys = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    keys.push(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`)
  }
  return keys.map((key) =>
    Math.round(
      focusSessions.value
        .filter((s) => s.date === key)
        .reduce((sum, s) => sum + s.actualSec, 0) / 60
    )
  )
})
const renderChart = () => {
  if (!chartRef.value) return
  const dk = isDark.value
  if (!chart) chart = echarts.init(chartRef.value)
  chart.setOption({
    grid: { left: 30, right: 10, top: 18, bottom: 24 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (ps) => `${ps[0].name} · ${ps[0].value} 分钟`,
      backgroundColor: dk ? '#22222b' : '#fff',
      borderColor: dk ? '#e9e9ee' : '#1f1f1f', borderWidth: 1.5,
      textStyle: { color: dk ? '#e9e9ee' : '#1f1f1f', fontSize: 12, fontWeight: 700 },
      extraCssText: 'box-shadow: 2px 2px 0 #000; border-radius: 8px;',
    },
    xAxis: {
      type: 'category',
      data: ['一', '二', '三', '四', '五', '六', '日'],
      axisLine: { lineStyle: { color: dk ? 'rgba(233,233,238,.35)' : '#1f1f1f' } },
      axisTick: { show: false },
      axisLabel: { color: dk ? 'rgba(233,233,238,.55)' : '#8a8a8a', fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: dk ? 'rgba(233,233,238,.12)' : '#ececec', type: 'dashed' } },
      axisLabel: { color: dk ? 'rgba(233,233,238,.4)' : '#b4b4bc', fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        data: weekFocusMin.value,
        barWidth: 18,
        itemStyle: {
          color: '#fbbc04',
          borderColor: dk ? '#e9e9ee' : '#1f1f1f',
          borderWidth: 2,
          borderRadius: [6, 6, 0, 0],
        },
      },
    ],
  })
}
const onResize = () => chart?.resize()
onMounted(() => {
  renderChart()
  window.addEventListener('resize', onResize)
})
// 专注记录变化（完成一轮等）后实时刷新柱图
watch(weekFocusMin, () => renderChart())
// 夜间模式切换后按新配色重绘
watch(isDark, () => renderChart())
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  chart?.dispose()
})
</script>

<style scoped>
.dash {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 28px 32px 40px;
  background: var(--paper);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-content: start;
}

/* ---------- ① 问候大卡 ---------- */
.hero {
  grid-column: 1 / -1;
  position: relative;
  overflow: hidden;
  border: var(--line);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-1);
  padding: 32px 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  transition:
    background-color 0.6s var(--ease-smooth),
    transform 0.4s var(--ease-smooth);
  transform-style: preserve-3d;
}
.hero-yellow {
  background: var(--c-yellow);
}
.hero-blue {
  background: var(--c-blue);
}
.hero-red {
  background: var(--c-red);
}
.hero-blue .hero-title,
.hero-blue .hero-sub,
.hero-blue .hero-date,
.hero-red .hero-title,
.hero-red .hero-sub,
.hero-red .hero-date {
  color: #fff;
}
.hero-left {
  flex: 1 1 auto;
  min-width: 0;
  position: relative;
  z-index: 1;
}
.hero-date {
  font-size: 14px;
  font-weight: 600;
  color: rgba(31, 31, 31, 0.75);
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  transition: color 0.6s var(--ease-smooth);
}
.hero-title {
  margin: 0;
  font-size: clamp(22px, 2.2vw, 34px);
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--ink);
  line-height: 1.2;
  word-break: break-word;
  transition: color 0.6s var(--ease-smooth);
}
.hero-sub {
  margin: 8px 0 0;
  font-size: 14px;
  color: rgba(31, 31, 31, 0.7);
  transition: color 0.6s var(--ease-smooth);
}
.hero-actions {
  flex: 0 0 auto;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
  position: relative;
  z-index: 1;
}
.hero-q .q-plus {
  font-weight: 800;
  margin-right: 2px;
}
.hero-shape {
  position: absolute;
  pointer-events: none;
}
.s-circle {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  border: 2px solid rgba(31, 31, 31, 0.25);
  right: -24px;
  bottom: -30px;
}
.s-tri {
  width: 0;
  height: 0;
  border-left: 26px solid transparent;
  border-right: 26px solid transparent;
  border-bottom: 44px solid rgba(31, 31, 31, 0.18);
  left: 42%;
  top: -18px;
  transform: rotate(12deg);
}

/* ---------- 卡片通用 ---------- */
.cell {
  padding: 22px 24px;
  min-height: 188px;
  display: flex;
  flex-direction: column;
}
.cell-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.cell-head h2 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 16px;
  font-weight: 800;
  color: var(--ink);
}
.link {
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: var(--c-blue);
  cursor: pointer;
  padding: 2px 4px;
}
.link.green {
  color: var(--c-green);
}
.link.red {
  color: var(--c-red);
}
.link.center-link {
  align-self: center;
  margin-top: auto;
}
.mini-scope {
  display: inline-flex;
  align-self: flex-start;
  gap: 3px;
  background: #f1f1ee;
  border: 1.5px solid #1f1f1f;
  border-radius: 999px;
  padding: 2px;
  margin: -8px 0 10px;
}
.mini-scope button {
  border: none;
  border-radius: 999px;
  background: transparent;
  color: rgba(31, 31, 31, 0.6);
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, transform 0.12s;
}
.mini-scope button:hover {
  transform: translateY(-1px);
}
.mini-scope button.active {
  background: #1f1f1f;
  color: #fff;
}
.big-num {
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.sub-line {
  margin-top: 6px;
  font-size: 13px;
  color: #8a8a8a;
}
.empty-line {
  margin: 14px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: #9a9a9a;
}
.center-empty {
  text-align: center;
  margin: auto 0;
}

/* ② 今日任务 */
.progress-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.progress-track {
  flex: 1;
  height: 12px;
  border: 2px solid var(--ink);
  border-radius: 999px;
  overflow: hidden;
  background: #fff;
}
.progress-fill {
  height: 100%;
  background: var(--c-red);
  border-right: 2px solid var(--ink);
  transition: width 0.5s var(--ease-smooth);
}
.progress-num {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

/* 今日任务清单 */
.task-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 150px;
  overflow-y: auto;
}
.task-line {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background 0.15s;
}
.task-line:hover { background: #f6f5f0; }
.task-chk {
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  border: 2px solid var(--ink);
  border-radius: 5px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.task-name {
  font-size: 13px;
  color: var(--ink);
  line-height: 1.35;
  word-break: break-word;
}
.task-line.done .task-name {
  color: #a0a0a0;
  text-decoration: line-through;
}
.task-more {
  margin: 6px 0 0;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--c-blue);
  cursor: pointer;
}

/* ④ 今日专注 */
.focus-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
}
.focus-btn {
  font-size: 14px;
  padding: 12px 18px;
}
.focus-live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--c-green);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-green);
  animation: live-pulse 1.2s ease-in-out infinite;
}
@keyframes live-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.7); }
}

/* ⑤ 今日心情 */
.mood-ico,
.rec-ico {
  color: var(--c-red);
  font-size: 19px;
}
.rec-ico {
  color: var(--ink);
}
.moods {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}
.mood-item {
  border: 2px solid transparent;
  background: transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 6px 4px;
  border-radius: 14px;
  transition:
    background 0.15s ease,
    transform 0.15s var(--ease-spring),
    border-color 0.15s ease;
}
.mood-item:hover {
  background: var(--c-red-soft);
  transform: translateY(-2px);
}
.mood-item.active .mood-emoji {
  box-shadow: 2px 2px 0 var(--ink);
}
.mood-item.active .mood-label {
  font-weight: 800;
  color: var(--ink);
}
.mood-preview {
  margin: 10px 0 0;
  font-size: 12.5px;
  line-height: 1.7;
  color: rgba(31, 31, 31, 0.62);
  background: var(--c-red-soft);
  border: 1.5px dashed var(--c-red);
  border-radius: 10px;
  padding: 8px 11px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.mood-emoji {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  border: 2px solid var(--ink);
  border-radius: 50%;
  background: #fff;
}
.mood-label {
  font-size: 12px;
  color: #6b6b6b;
}

/* ⑥ 心屿 AI */
.cell-ai {
  cursor: pointer;
  transition: transform 0.18s var(--ease-spring, ease);
}
.cell-ai:hover {
  transform: translateY(-2px);
}
.ai-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--c-blue, #1a73e8);
  border: 2px solid var(--ink, #1f1f1f);
  box-shadow: 2px 2px 0 var(--ink, #1f1f1f);
  display: inline-block;
}
.ai-preview {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ai-chat {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ai-msg {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  line-height: 1.5;
}
.ai-msg.user {
  flex-direction: row-reverse;
}
.ai-role {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--c-blue, #1a73e8);
  color: #fff;
  border: 1.5px solid var(--ink, #1f1f1f);
  flex-shrink: 0;
}
.ai-msg.assistant .ai-role {
  background: var(--ink, #1f1f1f);
}
.ai-text {
  flex: 1;
  background: #fff;
  border: 1.5px solid var(--ink, #1f1f1f);
  border-radius: 8px;
  padding: 4px 8px;
  font-weight: 600;
  color: var(--ink, #1f1f1f);
  box-shadow: 1.5px 1.5px 0 var(--ink, #1f1f1f);
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ai-msg.user .ai-text {
  background: var(--c-blue-soft, #e8f0fe);
}
.ai-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(31, 31, 31, 0.55);
}
.ai-welcome {
  font-size: 20px;
  font-weight: 800;
}
.ai-hint {
  font-size: 12px;
  font-weight: 600;
}

/* ⑦⑧ 趋势与优先级分布 */
.cell-trend,
.cell-recent {
  min-height: 220px;
}
.cell-trend-link {
  cursor: pointer;
  transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.cell-trend-link:hover {
  transform: translateY(-3px);
}
.chart {
  flex: 1;
  min-height: 150px;
}

/* ⑧ 迷你优先级分布环 */
.cell-dist {
  min-height: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.cell-dist .mini-dist {
  flex: 1;
}
.cell-dist:hover {
  transform: translateY(-3px);
}
.mini-dist {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  margin-top: 4px;
}
.mini-donut-wrap {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
}
.mini-donut {
  width: 100%;
  height: 100%;
}
.mini-donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
}
.mini-donut-center strong {
  font-size: 28px;
  font-weight: 800;
  color: #1f1f1f;
  line-height: 1;
}
.mini-donut-center span {
  font-size: 11px;
  color: rgba(31, 31, 31, 0.5);
  font-weight: 700;
}
.mini-legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.mini-legend li {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 700;
  color: #1f1f1f;
  white-space: nowrap;
}
.ml-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  border: 1.5px solid #1f1f1f;
  flex-shrink: 0;
}
.ml-name {
  color: rgba(31, 31, 31, 0.75);
}
.ml-val {
  font-variant-numeric: tabular-nums;
  color: #1f1f1f;
  font-weight: 800;
}
.mini-empty {
  margin: 0;
  font-size: 12.5px;
  color: rgba(31, 31, 31, 0.42);
  text-align: center;
  line-height: 1.6;
}
@media (max-width: 760px) {
  .mini-dist {
    flex-direction: column;
    gap: 16px;
  }
  .mini-empty {
    position: static;
    transform: none;
    text-align: center;
  }
}

/* 响应式：窄屏降列 */
@media (max-width: 1100px) {
  .dash {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 760px) {
  .dash {
    grid-template-columns: 1fr;
    padding: 18px 16px 32px;
  }
  .hero-sub { margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,.85); font-weight: 500; }
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
  .hero-actions {
    justify-content: flex-start;
  }
}

/* ---------- 夜间模式 ---------- */
html.dark .mini-scope { background: var(--hover-bg); }
html.dark .mini-scope button { color: var(--ink-55); }
html.dark .progress-track,
html.dark .task-chk,
html.dark .mood-emoji,
html.dark .ai-text { background: var(--card); }
/* 「心屿」角色徽标：夜间浅墨底配深字（原 var(--ink) 浅底 + 固定白字会消失） */
html.dark .ai-msg.assistant .ai-role { background: #e9e9ee; color: #16161c; }
html.dark .task-line:hover { background: var(--hover-bg); }
html.dark .sub-line,
html.dark .empty-line,
html.dark .mood-label { color: var(--ink-40); }
html.dark .mini-donut-center strong,
html.dark .mini-legend li,
html.dark .ml-val { color: var(--ink); }
html.dark .mini-donut-center span,
html.dark .ml-name { color: var(--ink-55); }
html.dark .ai-empty { color: var(--ink-55); }
html.dark .mood-preview { color: var(--ink-70); }
html.dark .s-tri { border-bottom-color: rgba(255, 255, 255, 0.22); }
html.dark .task-line.done .task-name { color: var(--ink-55); }
/* 「开始专注」夜间用黑底白字（压过 KitButton 黄底样式） */
html.dark .cell-focus .focus-btn.is-solid {
  background: var(--ink);
  color: var(--paper);
  box-shadow: 3px 3px 0 #000;
}
html.dark .cell-focus .focus-btn.is-solid:hover { box-shadow: 4px 4px 0 #000; }
html.dark .cell-focus .focus-btn.is-solid:active { box-shadow: 0 0 0 #000; }
</style>
