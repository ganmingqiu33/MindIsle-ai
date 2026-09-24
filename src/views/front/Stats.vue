<template>
  <div class="stats-page">
    <!-- ① 蓝色问候卡：右侧 计划 / 专注 索引 -->
    <div class="hero">
      <div class="hero-left">
        <h1 class="hero-title">让每一份努力，都看得见</h1>
        <p class="hero-sub">计划与专注的长期轨迹，都在这里沉淀。</p>
      </div>
      <div class="hero-right">
        <div class="tab-switch">
          <button :class="{ active: tab === 'plans' }" @click="switchTab('plans')">计划</button>
          <button :class="{ active: tab === 'focus' }" @click="switchTab('focus')">专注</button>
        </div>
      </div>
      <span class="hero-shape s-circle" aria-hidden="true"></span>
      <span class="hero-shape s-tri" aria-hidden="true"></span>
    </div>

    <!-- ============ 计划分析 ============ -->
    <div v-show="tab === 'plans'" class="panel">
      <!-- KPI 三卡 -->
      <div class="kpi-grid">
        <div class="kpi-card kpi-accent">
          <p class="kpi-label">历史累积完成计划</p>
          <div class="kpi-num">{{ planStats.historyDone }}<span class="unit">条</span></div>
          <p class="kpi-sub">共创建 {{ planStats.historyTotal }} 条计划</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">最近 7 天日均完成</p>
          <div class="kpi-num blue">{{ planStats.weekAvg }}<span class="unit">条/天</span></div>
          <p class="kpi-sub">7 天共完成 {{ planStats.weekDone }} 条</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">最近 7 天完成率</p>
          <div class="kpi-num blue">{{ planStats.weekRate }}<span class="unit">%</span></div>
          <p class="kpi-sub">{{ planStats.weekDone }} / {{ planStats.weekTotal }} 条</p>
        </div>
      </div>

      <!-- 完成计划优先级分布环（口径可切换） -->
      <div class="card ring-card">
        <h2 class="card-title">
          完成计划优先级分布
          <div class="scope-switch">
            <button :class="{ active: ringScope === 'today' }" @click="setDistScope('today')">今日</button>
            <button :class="{ active: ringScope === 'week' }" @click="setDistScope('week')">最近 7 天</button>
            <button :class="{ active: ringScope === 'history' }" @click="setDistScope('history')">历史累积</button>
          </div>
        </h2>
        <div class="ring-body">
          <div class="donut-wrap">
            <svg viewBox="0 0 200 200" class="donut">
              <circle cx="100" cy="100" r="74" fill="none" stroke="#EFEFEF" stroke-width="26" />
              <circle
                v-for="(seg, i) in donutSegs"
                :key="seg.key"
                cx="100" cy="100" r="74" fill="none"
                :stroke="seg.color" stroke-width="26"
                :stroke-dasharray="`${seg.len - 2} ${RING_C - seg.len + 2}`"
                :stroke-dashoffset="-seg.acc"
                transform="rotate(-90 100 100)"
                stroke-linecap="butt"
              />
            </svg>
            <div class="donut-center">
              <strong>{{ scopedDoneCount }}</strong>
              <span>条已完成</span>
            </div>
          </div>
          <ul class="legend">
            <li v-for="q in quadrantList" :key="q.key">
              <span class="lg-dot" :style="{ background: q.color }"></span>
              <span class="lg-name">{{ q.label }}</span>
              <span class="lg-val">{{ q.count }} 条</span>
              <span class="lg-pct">{{ q.pct }}%</span>
            </li>
          </ul>
        </div>
        <p v-if="!scopedDoneCount" class="card-empty">{{ ringEmptyText }}</p>
      </div>
    </div>

    <!-- ============ 专注分析 ============ -->
    <div v-show="tab === 'focus'" class="panel">
      <!-- KPI 三卡 -->
      <div class="kpi-grid">
        <div class="kpi-card kpi-green">
          <p class="kpi-label">历史累积专注</p>
          <div class="kpi-num">{{ focusStats.historyCount }}<span class="unit">次</span></div>
          <p class="kpi-sub">累计 {{ focusStats.historyHM }}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">最近 7 天总专注时长</p>
          <div class="kpi-num green">{{ focusStats.weekHM }}</div>
          <p class="kpi-sub">7 天共 {{ focusStats.weekCount }} 次</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">日均时长 · 次数</p>
          <div class="kpi-num green">{{ focusStats.avgHM }}</div>
          <p class="kpi-sub">平均每天 {{ focusStats.avgCount }} 次</p>
        </div>
      </div>

      <!-- 专注内容时长分布（最近 7 天） -->
      <div class="card">
        <h2 class="card-title">专注内容时长分布<span class="title-note">最近 7 天</span></h2>
        <ul v-if="focusDist.length" class="dist-list">
          <li v-for="row in focusDist" :key="row.key">
            <div class="dist-top">
              <span class="dist-name">
                <span class="dist-tag" :style="{ background: row.color }"></span>
                {{ row.name }}
              </span>
              <span class="dist-time">{{ row.hm }} · {{ row.pct }}%</span>
            </div>
            <div class="dist-track">
              <span class="dist-fill" :style="{ width: row.pct + '%', background: row.color }"></span>
            </div>
          </li>
        </ul>
        <p v-else class="card-empty">最近 7 天还没有专注记录，先去完成一次 3 分钟以上的专注吧。</p>
      </div>

      <!-- 本周专注趋势 -->
      <div class="card">
        <h2 class="card-title">本周专注趋势</h2>
        <div ref="chartRef" class="chart"></div>
        <p v-if="!focusStats.weekCount" class="chart-empty">本周还没有专注，柱子在等你点亮。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { plans, plansOn, mkDate, quadrantColors, quadrantLabel, distScope, setDistScope, isDoneOn, hasEverDone } from '@/utils/plansStore'
import { sessions } from '@/utils/focusStore'
import { isDark } from '@/utils/theme'

const route = useRoute()
const router = useRouter()
const tab = ref(route.query.tab === 'focus' ? 'focus' : 'plans')
const switchTab = (v) => router.replace({ path: route.path, query: { tab: v } })

/* ===================== 计划统计 ===================== */
const QUADRANT_KEYS = [
  'important-urgent',
  'important-not-urgent',
  'urgent-not-important',
  'not-important-not-urgent',
]
const planStats = computed(() => {
  const donePlans = plans.value.filter((p) => hasEverDone(p))
  let weekDone = 0
  let weekTotal = 0
  for (let i = -6; i <= 0; i++) {
    const day = mkDate(i)
    const list = plansOn(day)
    weekTotal += list.length
    weekDone += list.filter((p) => isDoneOn(p, day)).length
  }
  return {
    historyTotal: plans.value.length,
    historyDone: donePlans.length,
    weekDone,
    weekTotal,
    weekAvg: (weekDone / 7).toFixed(1),
    weekRate: weekTotal ? Math.round((weekDone / weekTotal) * 100) : 0,
  }
})

/* 环：按象限统计已完成计划（口径：今日 / 最近 7 天 / 历史累积，跨页共享持久化，可被仪表盘带 ?scope= 直达） */
if (['today', 'week', 'history'].includes(route.query.scope)) setDistScope(route.query.scope)
const ringScope = distScope
const ringEmptyText = computed(() => ({
  today: '今天还没有完成的计划，去时间计划勾选一条吧。',
  week: '最近 7 天还没有完成的计划。',
  history: '还没有完成的计划，去时间计划勾选第一条吧。',
}[ringScope.value]))
const scopedDonePlans = computed(() => {
  if (ringScope.value === 'today') return plansOn(mkDate(0)).filter((p) => isDoneOn(p, mkDate(0)))
  if (ringScope.value === 'week') {
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
const scopedDoneCount = computed(() => scopedDonePlans.value.length)

const RING_C = 2 * Math.PI * 74
const quadrantList = computed(() => {
  const donePlans = scopedDonePlans.value
  const total = donePlans.length || 1
  return QUADRANT_KEYS.map((key) => {
    const count = donePlans.filter((p) => p.quadrant === key).length
    return {
      key,
      label: quadrantLabel[key],
      color: quadrantColors[key],
      count,
      pct: Math.round((count / total) * 100),
    }
  })
})
const donutSegs = computed(() => {
  let acc = 0
  return quadrantList.value
    .filter((q) => q.count > 0)
    .map((q) => {
      const seg = { ...q, acc, len: (q.count / (scopedDoneCount.value || 1)) * RING_C }
      acc += seg.len
      return seg
    })
})

/* ===================== 专注统计 ===================== */
const fmtHM = (sec) => {
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  if (h && m) return `${h}小时${m}分`
  if (h) return `${h}小时`
  return `${m}分钟`
}
const DIST_COLORS = ['#34A853', '#1A73E8', '#FBBC04', '#EA4335', '#9c6ade', '#f0793b', '#2bb8c0']
const FREE_COLOR = '#b4b4bc'

/* 最近 7 天（含今天）的专注记录，KPI 与内容分布共用同一口径 */
const weekSessions = computed(() => sessions.value.filter((s) => s.date >= mkDate(-6)))
const focusStats = computed(() => {
  const all = sessions.value
  const inWeek = weekSessions.value
  const weekSec = inWeek.reduce((sum, s) => sum + s.actualSec, 0)
  const histSec = all.reduce((sum, s) => sum + s.actualSec, 0)
  return {
    historyCount: all.length,
    historyHM: fmtHM(histSec),
    weekCount: inWeek.length,
    weekSec,
    weekHM: fmtHM(weekSec),
    avgHM: fmtHM(Math.round(weekSec / 7)),
    avgCount: (inWeek.length / 7).toFixed(1),
  }
})

/* 内容分布（最近 7 天口径）：按 taskTitle 聚合，空标题 = 无内容专注；最多 7 项其余并为「其他内容」 */
const focusDist = computed(() => {
  const map = new Map()
  for (const s of weekSessions.value) {
    const key = s.taskTitle?.trim() || '__free__'
    map.set(key, (map.get(key) || 0) + s.actualSec)
  }
  let rows = [...map.entries()].map(([key, sec]) => ({
    key,
    name: key === '__free__' ? '无内容专注' : key,
    sec,
    hm: fmtHM(sec),
  }))
  rows.sort((a, b) => b.sec - a.sec)
  let others = null
  if (rows.length > 7) {
    const rest = rows.slice(7)
    others = {
      key: '__others__',
      name: '其他内容',
      sec: rest.reduce((sum, r) => sum + r.sec, 0),
      hm: fmtHM(rest.reduce((sum, r) => sum + r.sec, 0)),
    }
    rows = rows.slice(0, 7)
    if (others.sec) rows.push(others)
  }
  const total = weekSessions.value.reduce((sum, s) => sum + s.actualSec, 0) || 1
  let colorIdx = 0
  return rows.map((r) => ({
    ...r,
    pct: Math.round((r.sec / total) * 100),
    color: r.key === '__free__' ? FREE_COLOR : r.key === '__others__' ? '#8a8a8a' : DIST_COLORS[colorIdx++ % DIST_COLORS.length],
  }))
})

/* ===================== 本周趋势 ECharts ===================== */
const chartRef = ref(null)
let chart = null
const weekData = computed(() => {
  // 周一=本周起点
  const now = new Date()
  const back = (now.getDay() + 6) % 7
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back)
  const arr = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    const p = (n) => String(n).padStart(2, '0')
    const key = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    const sec = sessions.value.filter((s) => s.date === key).reduce((sum, s) => sum + s.actualSec, 0)
    arr.push(Math.round(sec / 60))
  }
  return arr
})
const renderChart = () => {
  if (!chartRef.value) return
  const dk = isDark.value
  chart = echarts.init(chartRef.value)
  chart.setOption({
    grid: { left: 36, right: 12, top: 18, bottom: 26 },
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
      axisLabel: { color: dk ? 'rgba(233,233,238,.55)' : '#8a8a8a', fontSize: 12, fontWeight: 700 },
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
        data: weekData.value,
        barWidth: 22,
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
/* 支持外部带 ?tab= 直达；图表初始在 v-show 隐藏面板内（0 尺寸），切到专注页时重绘 */
watch(() => route.query.tab, (v) => {
  tab.value = v === 'focus' ? 'focus' : 'plans'
})
/* 仪表盘迷你环带 ?scope= 跳入时同步口径 */
watch(() => route.query.scope, (v) => {
  if (['today', 'week', 'history'].includes(v)) setDistScope(v)
})
watch(tab, async (v) => {
  if (v === 'focus') {
    await nextTick()
    if (chart) chart.resize()
    else renderChart()
  }
})
/* 夜间模式切换后按新配色重绘 */
watch(isDark, async () => {
  await nextTick()
  if (chartRef.value) {
    chart?.dispose()
    chart = null
    renderChart()
  }
})
onMounted(async () => {
  await nextTick()
  renderChart()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  chart?.dispose()
})
</script>

<style scoped>
.stats-page {
  flex: 1 0 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: #fff;
  overflow-y: auto;
}

/* ---------- 问候卡 ---------- */
.hero {
  border: 2px solid #1f1f1f; border-radius: 16px; box-shadow: 4px 4px 0 #1f1f1f;
  padding: 22px 28px;
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  position: relative; overflow: hidden; flex-shrink: 0;
  background: #FBBC04;
}
.hero-left { z-index: 1; }
.hero-title { margin: 0; font-size: clamp(18px, 1.8vw, 26px); font-weight: 800; color: #1f1f1f; }
.hero-sub { margin: 6px 0 0; font-size: 13px; color: rgba(31,31,31,.75); font-weight: 600; }
.hero-right { z-index: 1; flex-shrink: 0; }
.tab-switch {
  display: inline-flex; gap: 6px;
  background: rgba(255,255,255,.45);
  border: 2px solid #1f1f1f; border-radius: 999px;
  padding: 4px;
}
.tab-switch button {
  border: none; border-radius: 999px;
  background: transparent; color: rgba(31,31,31,.65);
  padding: 8px 26px; font-size: 14px; font-weight: 800; font-family: inherit;
  cursor: pointer; transition: background .15s, color .15s, transform .12s;
}
.tab-switch button:hover { transform: translateY(-1px); }
.tab-switch button.active { background: #1f1f1f; color: #fff; box-shadow: 2px 2px 0 rgba(31,31,31,.35); }
.hero-shape { position: absolute; pointer-events: none; opacity: .22; }
.s-circle { width: 110px; height: 110px; border-radius: 50%; background: #fff; top: -36px; right: 30%; }
.s-tri {
  width: 0; height: 0;
  border-left: 40px solid transparent; border-right: 40px solid transparent; border-bottom: 66px solid #fff;
  bottom: -28px; right: 6%;
}

.panel { display: flex; flex-direction: column; gap: 16px; }

/* ---------- KPI 卡片 ---------- */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.kpi-card {
  border: 2px solid #1f1f1f; border-radius: 16px; box-shadow: 3px 3px 0 #1f1f1f;
  background: #FCFCFA;
  padding: 20px 22px;
  display: flex; flex-direction: column; gap: 8px;
}
.kpi-accent { background: #E8F0FE; }
.kpi-green { background: #E6F4EA; }
.kpi-label { margin: 0; font-size: 13px; font-weight: 700; color: rgba(31,31,31,.55); }
.kpi-num {
  font-size: 40px; font-weight: 800; color: #1f1f1f; line-height: 1.1;
  font-variant-numeric: tabular-nums; letter-spacing: -0.02em;
}
.kpi-num.blue { color: #1A73E8; }
.kpi-num.green { color: #34A853; }
.kpi-num .unit { font-size: 15px; font-weight: 700; margin-left: 6px; color: rgba(31,31,31,.5); }
.kpi-sub { margin: 0; font-size: 12.5px; color: rgba(31,31,31,.48); font-weight: 600; }

/* ---------- 通用内容卡 ---------- */
.card {
  border: 2px solid #1f1f1f; border-radius: 16px; box-shadow: 3px 3px 0 #1f1f1f;
  background: #FCFCFA;
  padding: 20px 24px 22px;
}
.card-title {
  margin: 0 0 16px; font-size: 16px; font-weight: 800; color: #1f1f1f;
  display: flex; align-items: center; gap: 10px;
}
.title-note {
  font-size: 11.5px; font-weight: 700; color: #34A853;
  background: #E6F4EA; border: 1.5px solid #34A853; border-radius: 999px;
  padding: 2px 10px;
}
.card-empty { margin: 4px 0; font-size: 13px; color: rgba(31,31,31,.42); text-align: center; padding: 12px 0; }

/* ---------- 优先级分布环 ---------- */
.scope-switch {
  margin-left: auto;
  display: inline-flex; gap: 4px;
  background: #F1F1EE;
  border: 2px solid #1f1f1f; border-radius: 999px;
  padding: 3px;
}
.scope-switch button {
  border: none; border-radius: 999px;
  background: transparent; color: rgba(31,31,31,.6);
  padding: 4px 12px; font-size: 12px; font-weight: 800; font-family: inherit;
  cursor: pointer; transition: background .15s, color .15s, transform .12s;
}
.scope-switch button:hover { transform: translateY(-1px); }
.scope-switch button.active { background: #1f1f1f; color: #fff; }
.ring-body {
  display: flex; align-items: center; gap: 36px;
  flex-wrap: wrap; justify-content: center;
}
.donut-wrap { position: relative; width: 200px; height: 200px; flex-shrink: 0; }
.donut { width: 100%; height: 100%; }
.donut-center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
}
.donut-center strong { font-size: 38px; font-weight: 800; color: #1f1f1f; line-height: 1; }
.donut-center span { font-size: 12.5px; color: rgba(31,31,31,.5); font-weight: 700; }
.legend {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(2, minmax(180px, 1fr)); gap: 12px 32px;
  flex: 1; min-width: 280px;
}
.legend li {
  display: flex; align-items: center; gap: 9px;
  font-size: 13.5px; font-weight: 700; color: #1f1f1f;
}
.lg-dot { width: 12px; height: 12px; border-radius: 4px; border: 1.5px solid #1f1f1f; flex-shrink: 0; }
.lg-name { flex: 1; }
.lg-val { font-variant-numeric: tabular-nums; }
.lg-pct { color: rgba(31,31,31,.45); font-size: 12.5px; min-width: 42px; text-align: right; }

/* ---------- 专注内容分布 ---------- */
.dist-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
.dist-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 7px; }
.dist-name {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 800; color: #1f1f1f;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dist-tag { width: 10px; height: 10px; border-radius: 3px; border: 1.5px solid #1f1f1f; flex-shrink: 0; }
.dist-time { font-size: 12.5px; font-weight: 700; color: rgba(31,31,31,.55); font-variant-numeric: tabular-nums; flex-shrink: 0; }
.dist-track {
  height: 14px; border-radius: 999px;
  background: #EFEFEF; border: 1.5px solid #1f1f1f; overflow: hidden;
}
.dist-fill {
  display: block; height: 100%; border-radius: 999px;
  transition: width .5s cubic-bezier(.22,1,.36,1);
}

/* ---------- 周趋势 ---------- */
.chart { width: 100%; height: 240px; }
.chart-empty { margin: -30px 0 6px; text-align: center; font-size: 12.5px; color: rgba(31,31,31,.4); position: relative; pointer-events: none; }

/* ---------- 响应式 ---------- */
@media (max-width: 900px) {
  .kpi-grid { grid-template-columns: 1fr; }
  .legend { grid-template-columns: 1fr; min-width: 0; }
  .ring-body { gap: 22px; }
  .kpi-num { font-size: 34px; }
}
@media (max-width: 560px) {
  .stats-page { padding: 14px; }
  .hero { flex-direction: column; align-items: flex-start; padding: 18px; }
  .tab-switch { align-self: stretch; }
  .tab-switch button { flex: 1; padding: 8px 0; }
}

/* ---------- 夜间模式（黄色问候卡保持高饱和） ---------- */
html.dark .stats-page { background: var(--paper); }
html.dark .kpi-card,
html.dark .card { background: var(--card); box-shadow: 3px 3px 0 #000; }
html.dark .kpi-accent { background: var(--c-blue-soft); }
html.dark .kpi-green { background: var(--c-green-soft); }
html.dark .kpi-num,
html.dark .card-title,
html.dark .donut-center strong,
html.dark .legend li,
html.dark .dist-name { color: var(--ink); }
html.dark .kpi-label,
html.dark .kpi-sub,
html.dark .kpi-num .unit,
html.dark .card-empty,
html.dark .donut-center span,
html.dark .lg-pct,
html.dark .dist-time,
html.dark .chart-empty { color: var(--ink-55); }
html.dark .title-note { background: #14301d; color: #6fd088; border-color: #34A853; }
html.dark .scope-switch { background: var(--hover-bg); }
html.dark .scope-switch button { color: var(--ink-55); }
html.dark .scope-switch button.active { background: var(--ink); color: var(--paper); }
html.dark .dist-track { background: var(--hover-strong); }
</style>
