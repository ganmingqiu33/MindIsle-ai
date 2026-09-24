<template>
  <div class="dashboard" v-loading="loading">
    <PageHead>
      <template #title>数据分析</template>
      <template #buttons>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          size="small"
          @change="loadAll"
        />
        <el-button type="primary" size="small" :icon="Refresh" @click="loadAll">
          刷新
        </el-button>
      </template>
    </PageHead>

    <!-- 顶部统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6" v-for="card in statCards" :key="card.label">
        <div class="stat-card">
          <div class="stat-icon" :style="{ background: card.bg }">
            <el-icon :size="26"><component :is="card.icon" /></el-icon>
          </div>
          <div class="stat-body">
            <div class="stat-value">{{ card.value }}</div>
            <div class="stat-label">{{ card.label }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 中间两个图 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :span="12">
        <el-card shadow="never" class="chart-card">
          <div class="chart-title">情绪趋势分析</div>
          <div ref="emotionChartRef" class="chart-box"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never" class="chart-card">
          <div class="chart-title">咨询会话统计</div>
          <div class="consult-metrics">
            <div class="metric">
              <div class="metric-label">总会话数</div>
              <div class="metric-value">{{ consultation.totalSessions }}</div>
            </div>
            <div class="metric">
              <div class="metric-label">平均时长</div>
              <div class="metric-value">{{ consultation.avgDuration }}<span class="metric-unit">分钟</span></div>
            </div>
            <div class="metric">
              <div class="metric-label">活跃用户</div>
              <div class="metric-value">{{ consultation.activeUsers }}</div>
            </div>
          </div>
          <div ref="consultChartRef" class="chart-box small"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 底部活跃度趋势 -->
    <el-card shadow="never" class="chart-card bottom-card">
      <div class="chart-title">用户活跃度趋势</div>
      <div ref="activityChartRef" class="chart-box tall"></div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { Refresh, User, UserFilled, ChatDotRound, Sunny } from '@element-plus/icons-vue'
import PageHead from '@/components/PageHead.vue'
import {
  getDashboardOverview,
  getEmotionTrend,
  getConsultationStats,
  getActivityTrend,
} from '@/api/admin'

// ---------- 查询时间范围（默认近 28 天） ----------
const dateRange = ref([])
const loading = ref(false)

const getDefaultRange = () => {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 27)
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return [fmt(start), fmt(end)]
}

const buildParams = () => {
  const [startDate, endDate] = dateRange.value?.length ? dateRange.value : getDefaultRange()
  return { startDate, endDate }
}

// ---------- 顶部卡片 ----------
const overview = reactive({
  activeUsers: 0,
  newUsersToday: 0,
  newSessionsToday: 0,
  healthIndex: '-',
})

const statCards = ref([])

const buildStatCards = () => {
  statCards.value = [
    { label: '活跃用户', value: overview.activeUsers, icon: User, bg: 'linear-gradient(135deg,#667eea,#764ba2)' },
    { label: '今日新增用户', value: overview.newUsersToday, icon: UserFilled, bg: 'linear-gradient(135deg,#f093fb,#f5576c)' },
    { label: '今日新增会话', value: overview.newSessionsToday, icon: ChatDotRound, bg: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
    { label: '情绪健康指数', value: overview.healthIndex, icon: Sunny, bg: 'linear-gradient(135deg,#43e97b,#38f9d7)' },
  ]
}

// ---------- 咨询指标 ----------
const consultation = reactive({
  totalSessions: 0,
  avgDuration: 0,
  activeUsers: 0,
})

// ---------- echarts 实例 ----------
const emotionChartRef = ref()
const consultChartRef = ref()
const activityChartRef = ref()
let emotionChart = null
let consultChart = null
let activityChart = null

const baseAxis = {
  axisLine: { lineStyle: { color: '#dcdfe6' } },
  axisLabel: { color: '#909399', fontSize: 11 },
  splitLine: { lineStyle: { color: '#f0f2f5' } },
}

const renderEmotion = (data) => {
  emotionChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['平均情绪评分', '记录数量'], top: 0, textStyle: { color: '#606266' } },
    grid: { left: 50, right: 50, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: data.dates, ...baseAxis, boundaryGap: false },
    yAxis: [
      { type: 'value', name: '情绪评分', min: 0, max: 10, ...baseAxis },
      { type: 'value', name: '记录数量', min: 0, ...baseAxis, splitLine: { show: false } },
    ],
    series: [
      {
        name: '平均情绪评分',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        data: data.avgScores,
        itemStyle: { color: '#f7ba2a' },
        lineStyle: { width: 2.5 },
      },
      {
        name: '记录数量',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        data: data.recordCounts,
        itemStyle: { color: '#f56c6c' },
        lineStyle: { width: 2.5 },
      },
    ],
  })
}

const renderConsult = (data) => {
  consultChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['会话数量', '参与用户数'], top: 0, textStyle: { color: '#606266' } },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: data.dates, ...baseAxis },
    yAxis: { type: 'value', minInterval: 1, ...baseAxis },
    series: [
      {
        name: '会话数量',
        type: 'bar',
        barWidth: 10,
        itemStyle: { color: '#409eff', borderRadius: [3, 3, 0, 0] },
        data: data.sessionCounts,
      },
      {
        name: '参与用户数',
        type: 'bar',
        barWidth: 10,
        itemStyle: { color: '#e6a23c', borderRadius: [3, 3, 0, 0] },
        data: data.participantCounts,
      },
    ],
  })
}

const renderActivity = (data) => {
  const lines = [
    { name: '活跃用户', key: 'activeUsers', color: '#7c6ef0' },
    { name: '新增用户', key: 'newUsers', color: '#f7ba2a' },
    { name: '日记用户', key: 'diaryUsers', color: '#36cfc9' },
    { name: '咨询用户', key: 'consultationUsers', color: '#f5968f' },
  ]
  activityChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: lines.map((l) => l.name), top: 0, textStyle: { color: '#606266' } },
    grid: { left: 50, right: 30, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: data.dates, ...baseAxis, boundaryGap: false },
    yAxis: { type: 'value', minInterval: 1, ...baseAxis },
    series: lines.map((l, idx) => ({
      name: l.name,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      data: data[l.key],
      itemStyle: { color: l.color },
      lineStyle: { width: 2.5 },
      // 最后一条（咨询用户）加面积渐变，贴近截图
      areaStyle:
        idx === lines.length - 1
          ? {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(245,150,143,0.25)' },
                { offset: 1, color: 'rgba(245,150,143,0.02)' },
              ]),
            }
          : undefined,
    })),
  })
}

// ---------- 数据加载（接口失败用本地 Mock 兜底） ----------
const loadAll = async () => {
  loading.value = true
  const params = buildParams()
  try {
    const [ov, et, cs, at] = await Promise.all([
      getDashboardOverview(params, { silent: true }).catch(() => mockOverview),
      getEmotionTrend(params, { silent: true }).catch(() => buildMockEmotionTrend()),
      getConsultationStats(params, { silent: true }).catch(() => buildMockConsultationStats()),
      getActivityTrend(params, { silent: true }).catch(() => buildMockActivityTrend()),
    ])

    Object.assign(overview, ov)
    buildStatCards()

    Object.assign(consultation, {
      totalSessions: cs.totalSessions,
      avgDuration: cs.avgDuration,
      activeUsers: cs.activeUsers,
    })

    await nextTick()
    renderEmotion(et)
    renderConsult(cs.chart)
    renderActivity(at)
  } finally {
    loading.value = false
  }
}

const handleResize = () => {
  emotionChart?.resize()
  consultChart?.resize()
  activityChart?.resize()
}

onMounted(async () => {
  dateRange.value = getDefaultRange()
  await nextTick()
  emotionChart = echarts.init(emotionChartRef.value)
  consultChart = echarts.init(consultChartRef.value)
  activityChart = echarts.init(activityChartRef.value)
  window.addEventListener('resize', handleResize)
  loadAll()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  emotionChart?.dispose()
  consultChart?.dispose()
  activityChart?.dispose()
})

// ---------- 本地 Mock 数据 ----------
const mockOverview = {
  activeUsers: 2,
  newUsersToday: 0,
  newSessionsToday: 0,
  healthIndex: '7/10',
}

// 生成日期序列
const dateSeries = (start = '2026-01-15', days = 27) => {
  const arr = []
  const d = new Date(start)
  for (let i = 0; i < days; i++) {
    const cur = new Date(d)
    cur.setDate(d.getDate() + i)
    arr.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
    )
  }
  return arr
}

const buildMockEmotionTrend = () => {
  const dates = dateSeries()
  const peakIdx = dates.indexOf('2026-01-21')
  return {
    dates,
    avgScores: dates.map((_, i) => (i === peakIdx ? 7 : 0)),
    recordCounts: dates.map((_, i) => (i === peakIdx ? 1 : 0)),
  }
}

const buildMockConsultationStats = () => {
  const dates = dateSeries()
  return {
    totalSessions: 8,
    avgDuration: 18020.6,
    activeUsers: 2,
    chart: {
      dates,
      sessionCounts: dates.map((d) => {
        if (d === '2026-01-22' || d === '2026-01-24') return 1
        if (d === '2026-01-25') return 3
        if (d === '2026-02-09') return 3
        return 0
      }),
      participantCounts: dates.map((d) => {
        if (d === '2026-01-22' || d === '2026-01-24' || d === '2026-01-25' || d === '2026-02-09') return 1
        return 0
      }),
    },
  }
}

const buildMockActivityTrend = () => {
  const dates = dateSeries()
  const pulse = (peaks, value = 1) =>
    dates.map((d) => (peaks.includes(d) ? value : 0))
  return {
    dates,
    activeUsers: pulse(['2026-01-22', '2026-01-25', '2026-02-09']),
    newUsers: pulse(['2026-01-23']),
    diaryUsers: pulse(['2026-01-21', '2026-01-22']),
    consultationUsers: pulse(['2026-01-22', '2026-01-24', '2026-01-25', '2026-02-09']),
  }
}
</script>

<style scoped>
.stat-row {
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border-radius: 8px;
  padding: 20px 24px;
  border: 1px solid #ebeef5;
  transition: box-shadow 0.2s;
}

.stat-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.chart-row {
  margin-bottom: 16px;
}

.chart-card {
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  padding: 4px 0 12px;
}

.chart-box {
  width: 100%;
  height: 320px;
}

.chart-box.small {
  height: 220px;
}

.chart-box.tall {
  height: 340px;
}

.bottom-card {
  border-radius: 8px;
}

.consult-metrics {
  display: flex;
  justify-content: space-around;
  padding: 8px 0 4px;
}

.metric {
  text-align: center;
}

.metric-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}

.metric-value {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
}

.metric-unit {
  font-size: 12px;
  font-weight: 400;
  color: #909399;
  margin-left: 2px;
}
</style>
