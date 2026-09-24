<template>
  <div class="plans">
    <!-- 顶部：问候卡 -->
    <div class="hero hero-blue">
      <div class="hero-left">
        <h1 class="hero-title">创建属于自己的计划！</h1>
         <p class="hero-sub">计划是实现目标的重要工具，帮助你组织时间和资源，实现目标。</p>
      </div>
      <button class="ai-goal-btn" @click="goAiGoal">✦ AI 创建目标</button>
      <span class="hero-shape s-circle"></span>
      <span class="hero-shape s-tri"></span>
    </div>

    <!-- 三栏主区 -->
    <div class="body">
      <!-- ============ 左栏 ============ -->
      <aside class="side-left">
        <!-- 月历 -->
        <div class="cal">
          <div class="cal-head">
            <button class="cal-nav" @click="prevMonth">‹</button>
            <span class="cal-title">{{ year }}年{{ month }}月</span>
            <button class="cal-nav" @click="nextMonth">›</button>
          </div>
          <div class="cal-week">
            <span v-for="w in weekdays" :key="w">{{ w }}</span>
          </div>
          <div class="cal-grid">
            <button
              v-for="(d, i) in days"
              :key="i"
              class="cal-cell"
              :class="{
                outside: !d.inMonth,
                today: d.isToday,
                selected: d.date === selectedDate && !d.isToday,
                'cal-drop': draggingId && calDragOver === d.date,
              }"
              @click="pickDate(d)"
              @dragover.prevent="calDragOver = d.date"
              @dragleave="calDragOver = null"
              @drop.prevent="onCalDrop(d)"
            >
              <span class="cal-num">{{ d.num }}</span>
              <div v-if="d.planCount" class="cal-dots">
                <span
                  v-for="(c, ci) in d.dotColors.slice(0, 4)"
                  :key="ci"
                  class="cal-dot"
                  :style="{ background: c }"
                ></span>
              </div>
            </button>
          </div>
          <div class="cal-footer">
            <button class="cal-today" @click="goToday">回到今天</button>
            <span class="cal-pick">{{ selectedDateLabel }} 的计划</span>
          </div>
        </div>

        <!-- 今日运势 -->
        <div class="history fortune-card">
          <div class="hist-head">
            <span class="hist-bar"></span>
            <h3>今日运势</h3>
          </div>
          <p class="hist-date">{{ todayFortune.icon }} {{ todayFortune.title }}</p>
          <ul class="hist-list">
            <li>
              <span class="hist-text">{{ todayFortune.text }}</span>
            </li>
          </ul>
        </div>
      </aside>

      <!-- ============ 中间：四象限 ============ -->
      <main class="quadrants">
        <section
          v-for="q in quadrantList"
          :key="q.key"
          class="quadrant"
          :class="['q-' + q.key, { 'drag-over': dragOverQ === q.key && draggingId }]"
          @dragover.prevent="dragOverQ = q.key"
          @dragleave="dragOverQ = null"
          @drop.prevent="onDrop(q.key)"
        >
          <header class="q-head">
            <span class="q-dot"></span>
            <span class="q-name">{{ q.name }}</span>
            <span class="q-count">{{ quadrantPlans(q.key).length }}</span>
            <button class="q-add" :title="'在' + q.name + '新建计划'" @click="openComposer(q.key)">＋</button>
          </header>
          <div class="q-body">
            <div
              v-for="p in quadrantPlans(q.key)"
              :key="p.id"
              class="plan-chip"
              :class="{ selected: selectedId === p.id, done: isDoneOn(p, selectedDate), dragging: draggingId === p.id }"
              draggable="true"
              @click="selectedId = p.id"
              @dragstart="onDragStart($event, p)"
              @dragend="onDragEnd"
            >
              <button class="chk" :class="{ checked: isDoneOn(p, selectedDate) }" @click.stop="toggleDone(p, selectedDate)">
                <svg viewBox="0 0 12 12" width="9" height="9"><path d="M2 6.5L4.5 9L10 3" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <span v-if="timeRange(p)" class="chip-time">{{ timeRange(p) }}</span>
              <span class="chip-title">{{ p.title }}</span>
              <span v-if="p.repeat.type !== 'none'" class="chip-repeat">{{ repeatShort[p.repeat.type] }}</span>
            </div>
            <p v-if="quadrantPlans(q.key).length === 0" class="q-empty">{{ q.empty }}</p>
          </div>
        </section>
      </main>

      <!-- ============ 右栏：计划详情 ============ -->
      <aside class="side-right">
        <template v-if="selected">
          <input
            class="det-title-input"
            v-model="detDraft.title"
            placeholder="计划标题"
          />

          <!-- 描述 -->
          <textarea
            class="det-desc"
            v-model="detDraft.desc"
            placeholder="选填：这件事具体要做什么、有什么注意事项……"
          ></textarea>

          <!-- 可编辑字段（草稿模式：点保存才生效） -->
          <div class="det-fields">
            <div class="det-row" @click="togglePanel('quadrant')">
              <span class="det-label">重要优先级<span v-if="detDraft.quadrant && detDraft.quadrant !== selected.quadrant" class="unsaved-dot" title="未保存"></span></span>
              <span class="det-value">
                <span class="q-mark" :style="{ background: quadrantColors[detDraft.quadrant] }"></span>
                {{ quadrantLabel[detDraft.quadrant] }}
                <span class="arrow">›</span>
              </span>
            </div>
            <div v-if="panel === 'quadrant'" class="inline-panel">
              <button
                v-for="q in quadrantList"
                :key="q.key"
                class="pick-chip"
                :class="{ active: detDraft.quadrant === q.key }"
                @click="pickDetailQuadrant(q.key)"
              >
                <span class="q-mark" :style="{ background: quadrantColors[q.key] }"></span>{{ q.name }}
              </button>
            </div>

            <div class="det-row" @click="togglePanel('deadline')">
              <span class="det-label">时间段</span>
              <span class="det-value">{{ timeRange(detDraft) || '未设置' }} <span class="arrow">›</span></span>
            </div>
            <div v-if="panel === 'deadline'" class="inline-panel">
              <p class="panel-sub">设置当天的时间段<span class="panel-hint">（结束时间可留空）</span></p>
              <div class="time-range">
                <input type="time" class="time-ctl" v-model="detDraft.startTime" @change="validateEnd(detDraft)" />
                <span class="tr-sep">至</span>
                <input
                  type="time"
                  class="time-ctl"
                  :disabled="!detDraft.startTime"
                  :min="detDraft.startTime || '00:00'"
                  v-model="detDraft.endTime"
                  @change="validateEnd(detDraft)"
                />
                <button v-if="detDraft.startTime || detDraft.endTime" class="time-clear" @click="detDraft.startTime = ''; detDraft.endTime = ''">清除</button>
              </div>
            </div>

            <div class="det-row" @click="togglePanel('repeat')">
              <span class="det-label">重复</span>
              <span class="det-value">{{ repeatLabel(detDraft.repeat) }} <span class="arrow">›</span></span>
            </div>
            <div v-if="panel === 'repeat'" class="inline-panel">
              <div class="rep-chips">
                <button
                  v-for="r in repeatTypes"
                  :key="r.key"
                  class="rep-chip"
                  :class="{ active: detDraft.repeat.type === r.key }"
                  @click="detDraft.repeat.type = r.key"
                >{{ r.name }}</button>
              </div>
              <RepeatConfig :rep="detDraft.repeat" />
            </div>
          </div>

          <button class="det-save" @click="saveDetail">{{ saveHint }}</button>
          <button class="det-delete" @click="askDelete">删除计划</button>
        </template>

        <template v-else>
          <div class="det-empty">
            <div class="det-empty-ico">✦</div>
            <p>{{ selectedDateLabel }} 还没有计划</p>
            <button class="det-empty-btn" @click="openComposer()">＋ 新建一个</button>
          </div>
        </template>
      </aside>
    </div>

    <!-- ============ 新建计划弹层 ============ -->
    <div v-if="composerOpen" class="modal-mask" @click.self="closeComposer">
      <div class="composer">
        <!-- 标题输入 -->
        <div class="cmp-top">
          <button
            v-if="!draft.quadrant"
            class="cmp-q-dot unset"
            title="选择象限"
            @click="cmpTab = 'quadrant'"
          >?</button>
          <span
            v-else
            class="cmp-q-dot"
            :style="{ background: quadrantColors[draft.quadrant] }"
            :title="quadrantLabel[draft.quadrant]"
          ></span>
          <input
            ref="cmpTitleRef"
            v-model="draft.title"
            class="cmp-title"
            :placeholder="draft.quadrant ? `在「${quadrantLabel[draft.quadrant]}」新建计划...` : '我准备做...（请先选择象限）'"
            @keydown.enter="saveComposer"
          />
          <button class="cmp-send" title="保存" @click="saveComposer">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </div>

        <!-- 配置入口：未选象限时先选象限 -->
        <div class="cmp-tabs">
          <button v-if="!draft.quadrant" class="cmp-tab" :class="{ active: cmpTab === 'quadrant' }" @click="cmpTab = 'quadrant'">
            <span class="tab-dot"></span>
            <span>四象限</span>
          </button>
          <button class="cmp-tab" :class="{ active: cmpTab === 'deadline' }" @click="cmpTab = 'deadline'">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            <span>时间段</span>
          </button>
          <button class="cmp-tab" :class="{ active: cmpTab === 'repeat' }" @click="cmpTab = 'repeat'">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
            <span>重复</span>
          </button>
        </div>

        <!-- 配置区 -->
        <div class="cmp-panel">
          <!-- 象限选择（仅未选时） -->
          <div v-if="cmpTab === 'quadrant' && !draft.quadrant" class="quad-pick">
            <button
              v-for="q in quadrantList"
              :key="q.key"
              class="pick-chip big"
              @click="pickComposerQuadrant(q.key)"
            >
              <span class="q-mark" :style="{ background: quadrantColors[q.key] }"></span>{{ q.name }}
            </button>
          </div>

          <!-- 时间段 -->
          <div v-else-if="cmpTab === 'deadline'">
            <p class="panel-sub">设置当天的时间段<span class="panel-hint">（结束时间可留空）</span></p>
            <!-- 当天具体时间区间，结束时间可空 -->
            <div class="time-range">
              <input type="time" class="time-ctl" v-model="draft.startTime" @change="validateEnd(draft)" />
              <span class="tr-sep">至</span>
              <input
                type="time"
                class="time-ctl"
                :disabled="!draft.startTime"
                :min="draft.startTime || '00:00'"
                v-model="draft.endTime"
                @change="validateEnd(draft)"
              />
              <button v-if="draft.startTime || draft.endTime" type="button" class="time-clear" @click="draft.startTime = ''; draft.endTime = ''">清除</button>
            </div>
          </div>

          <!-- 重复 -->
          <div v-else-if="cmpTab === 'repeat'">
            <div class="rep-chips">
              <button
                v-for="r in repeatTypes"
                :key="r.key"
                class="rep-chip"
                :class="{ active: draft.repeat.type === r.key }"
                @click="draft.repeat.type = r.key"
              >{{ r.name }}</button>
            </div>
            <RepeatConfig :rep="draft.repeat" />
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="cmp-foot">
          <button class="outline-btn" @click="closeComposer">取消</button>
          <button class="dark-btn" @click="saveComposer">保存</button>
        </div>
      </div>
    </div>

    <!-- ============ 删除确认 ============ -->
    <div v-if="confirmDeleteOpen" class="modal-mask" @click.self="confirmDeleteOpen = false">
      <div class="mini-dialog">
        <h3 class="dlg-title">删除这条计划？</h3>
        <p class="dlg-text">「{{ selected?.title }}」将被永久删除，此操作无法撤销。</p>
        <div class="dlg-foot">
          <button class="outline-btn" @click="confirmDeleteOpen = false">取消</button>
          <button class="danger-btn" @click="confirmDelete">确认删除</button>
        </div>
      </div>
    </div>

    <!-- ============ 重复计划拖动：影响范围 ============ -->
    <div v-if="moveDialog.open" class="modal-mask" @click.self="closeMoveDialog">
      <div class="mini-dialog">
        <h3 class="dlg-title">更改重复计划</h3>
        <p class="dlg-text">「{{ moveDialog.plan?.title }}」是重复计划，你希望更改哪些？</p>
        <div class="move-opts">
          <button class="move-opt" @click="applyMove('once')">
            <span class="move-opt-name">仅此计划</span>
            <span class="move-opt-desc">只改 {{ selectedDateLabel }} 这一次，其他时间不变</span>
          </button>
          <button class="move-opt" @click="applyMove('future')">
            <span class="move-opt-name">本条及以后</span>
            <span class="move-opt-desc">从 {{ selectedDateLabel }} 起更改，之前的记录保持不变</span>
          </button>
          <button class="move-opt" @click="applyMove('all')">
            <span class="move-opt-name">全部计划</span>
            <span class="move-opt-desc">这个重复系列的所有计划都会更改</span>
          </button>
        </div>
        <div class="dlg-foot">
          <button class="outline-btn" @click="closeMoveDialog">取消</button>
        </div>
      </div>
    </div>

    <!-- ============ 拖到日历：添加确认 ============ -->
    <div v-if="dropDialog.open" class="modal-mask" @click.self="closeDropDialog">
      <div class="mini-dialog">
        <h3 class="dlg-title">添加到 {{ dropDateLabel }}？</h3>
        <p class="dlg-text">{{ dropDialogText }}</p>
        <div class="dlg-foot">
          <button class="outline-btn" @click="closeDropDialog">取消</button>
          <button class="dark-btn" @click="confirmDrop">确认添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, h, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  plans, planOnDate, addPlan, removePlan, toggleDone, isDoneOn, savePlans,
  quadrantColors, quadrantLabel,
  fmtDate as fmt, parseDate as parseD, mkDate, dow1,
} from '@/utils/plansStore'

const router = useRouter()

/* 跳转 AI 聊天，预填目标制定提示 */
const goAiGoal = () => {
  router.push({ path: '/front/ai', query: { prefill: '帮我制定7天学习计划，目标是：' } })
}

/* ================= 页面常量 ================= */
const quadrantList = [
  { key: 'urgent-not-important', name: '紧急不重要', empty: '交给别人或自己做' },
  { key: 'important-urgent', name: '重要且紧急', empty: '立即去做' },
  { key: 'not-important-not-urgent', name: '不重要不紧急', empty: '有空再做' },
  { key: 'important-not-urgent', name: '重要不紧急', empty: '规划后再做' },
]
const repeatTypes = [
  { key: 'none', name: '无重复' },
  { key: 'daily', name: '每日' },
  { key: 'weekly', name: '每周' },
  { key: 'monthly', name: '每月' },
  { key: 'workday', name: '法定工作日' },
]
const repeatShort = { daily: '每日', weekly: '每周', monthly: '每月', workday: '工作日' }

// 时间区间：有结束显示 "07:00–08:00"，只开始显示 "07:00"
const timeRange = (p) => {
  if (!p?.startTime) return ''
  return p.endTime ? `${p.startTime}–${p.endTime}` : p.startTime
}
// 结束时间必须晚于开始时间，否则清空并提示
const validateEnd = (obj) => {
  if (obj.startTime && obj.endTime && obj.endTime <= obj.startTime) {
    obj.endTime = ''
    ElMessage.warning('结束时间要晚于开始时间')
    return false
  }
  return true
}
const repeatLabel = (r) => {
  if (r.type === 'none') return '无重复'
  if (r.type === 'daily') return r.interval > 1 ? `每 ${r.interval} 天` : '每日'
  if (r.type === 'workday') return '法定工作日'
  if (r.type === 'weekly') {
    const names = ['一', '二', '三', '四', '五', '六', '日']
    return '每周' + r.weekdays.slice().sort((a, b) => a - b).map((w) => names[w - 1]).join('、')
  }
  if (r.type === 'monthly') {
    if (r.monthMode === 'date') return '每月 ' + r.monthDays.slice().sort((a, b) => a - b).join('、') + ' 日'
    return `每月${['一', '二', '三', '四', '最后'][r.monthWeek]}周${['一', '二', '三', '四', '五', '六', '日'][r.monthDow - 1]}`
  }
  return '无重复'
}

/* ================= 今日运势（按用户+日期随机，不同用户不一样） ================= */
const fortunePool = [
  { icon: '🌟', title: '事业运', text: '今天适合推进那件一直拖着的事，动笔就有起色。' },
  { icon: '💡', title: '灵感运', text: '想法会比平时多，随身记下来，别让好点子溜走。' },
  { icon: '🤝', title: '人际运', text: '主动联系一位老朋友，可能带来意想不到的机会。' },
  { icon: '📚', title: '学习运', text: '理解力在线，啃硬骨头的效率比平时高。' },
  { icon: '🌿', title: '健康运', text: '状态不错，适合出门走走，晒晒太阳。' },
  { icon: '💰', title: '财运', text: '量入为出，今天不适合冲动消费。' },
  { icon: '❤️', title: '心情运', text: '会有一件小事让你开心一整天，留意一下。' },
  { icon: '🎯', title: '专注运', text: '深度工作的好时机，把手机调静音。' },
  { icon: '☕', title: '休闲运', text: '忙里偷闲喝杯东西，效率反而更高。' },
  { icon: '🚀', title: '行动力', text: '想到就去做，今天的执行力比犹豫更值钱。' },
  { icon: '🌈', title: '幸运色', text: '今天的幸运色是蓝色，穿一件或带一件。' },
  { icon: '🍀', title: '小确幸', text: '会遇到一件意料之外的好事，保持期待。' },
  { icon: '🧘', title: '静心运', text: '适合冥想或独处十分钟，给大脑充个电。' },
  { icon: '📝', title: '整理运', text: '清理桌面或文件，思路会跟着变清晰。' },
  { icon: '🔋', title: '能量运', text: '精力充沛，适合处理需要集中注意力的任务。' },
  { icon: '🌙', title: '睡眠运', text: '今晚早点睡，明天会感谢今天的自己。' },
  { icon: '🎨', title: '创意运', text: '右脑比较活跃，做设计或写东西会顺手。' },
  { icon: '🥗', title: '饮食运', text: '吃点清淡的，肠胃会感谢你。' },
  { icon: '📞', title: '沟通运', text: '有话直说，今天的误会概率比平时低。' },
  { icon: '🌱', title: '成长运', text: '做一件让未来的自己更好的小事，哪怕只花五分钟。' },
]
const hashSeed = (str) => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}
const fortuneDate = new Date()
const fortuneTodayStr = fortuneDate.getFullYear() + '-' + (fortuneDate.getMonth() + 1) + '-' + fortuneDate.getDate()
const fortuneIndex = computed(() => {
  try {
    const u = JSON.parse(localStorage.getItem('frontUser') || 'null')
    const uid = u && u.id != null ? u.id : 'anon'
    const seed = hashSeed(uid + '-' + fortuneTodayStr)
    return Math.floor(seed * fortunePool.length)
  } catch (e) {
    return Math.floor(Math.random() * fortunePool.length)
  }
})
const todayFortune = computed(() => fortunePool[fortuneIndex.value])
/* ================= 页面状态（plans 来自共享 store） ================= */
// 支持 ?date=YYYY-MM-DD 定位（如 AI 确认卡片「去看看」跳转到计划所在日期）
const initialDate = (() => {
  try {
    const v = new URLSearchParams(window.location.search).get('date')
    return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : mkDate(0)
  } catch {
    return mkDate(0)
  }
})()
const selectedDate = ref(initialDate)
const initialToday = plans.value.filter((p) => planOnDate(p, selectedDate.value))
const selectedId = ref(initialToday[0]?.id ?? null)
const selected = computed(() => plans.value.find((p) => p.id === selectedId.value) || null)

const quadrantPlans = (q) =>
  plans.value.filter((p) => p.quadrant === q && planOnDate(p, selectedDate.value))

/* ================= 日历 ================= */
const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const now0 = new Date()
const year = ref(now0.getFullYear())
const month = ref(now0.getMonth() + 1)
const todayStr = mkDate(0)

// 问候卡日期跟随当前查看的日期（此前固定显示今天，拖拽/切换日期后页面看起来没变）
const selectedDateLabel = computed(() => {
  const d = parseD(selectedDate.value)
  return `${d.getMonth() + 1}月${d.getDate()}日`
})

const prevMonth = () => {
  if (month.value === 1) { month.value = 12; year.value-- } else month.value--
}
const nextMonth = () => {
  if (month.value === 12) { month.value = 1; year.value++ } else month.value++
}
const goToday = () => {
  const n = new Date()
  year.value = n.getFullYear()
  month.value = n.getMonth() + 1
  selectedDate.value = mkDate(0)
}
const pickDate = (cell) => {
  if (!cell.inMonth) {
    year.value = cell.otherYear
    month.value = cell.otherMonth
  }
  selectedDate.value = cell.date
  // 选中日若无计划则清空详情
  const dayPlans = plans.value.filter((p) => planOnDate(p, cell.date))
  if (!dayPlans.some((p) => p.id === selectedId.value)) selectedId.value = dayPlans[0]?.id || null
}

const days = computed(() => {
  const firstDay = new Date(year.value, month.value - 1, 1)
  const totalDays = new Date(year.value, month.value, 0).getDate()
  const startWeekday = dow1(firstDay) - 1
  const arr = []

  const prevTotal = new Date(year.value, month.value - 1, 0).getDate()
  let py = year.value, pm = month.value - 1
  if (pm === 0) { pm = 12; py-- }
  for (let i = startWeekday - 1; i >= 0; i--) {
    const num = prevTotal - i
    arr.push({ num, inMonth: false, date: fmt(py, pm, num), otherYear: py, otherMonth: pm, planCount: 0, dotColors: [] })
  }

  for (let i = 1; i <= totalDays; i++) {
    const dateStr = fmt(year.value, month.value, i)
    const todays = plans.value.filter((p) => planOnDate(p, dateStr))
    arr.push({
      num: i,
      inMonth: true,
      date: dateStr,
      isToday: dateStr === todayStr,
      planCount: todays.length,
      dotColors: [...new Set(todays.map((p) => quadrantColors[p.quadrant]))],
    })
  }

  let ny = year.value, nm = month.value + 1, ni = 1
  if (nm === 13) { nm = 1; ny++ }
  while (arr.length < 42) {
    arr.push({ num: ni, inMonth: false, date: fmt(ny, nm, ni), otherYear: ny, otherMonth: nm, planCount: 0, dotColors: [] })
    ni++
  }
  return arr
})

/* ================= 详情编辑（草稿模式：改动先留在草稿，点保存才写入） ================= */
const panel = ref('')
const togglePanel = (name) => { panel.value = panel.value === name ? '' : name }
const saveHint = ref('保存')
const detDraft = reactive({
  title: '', desc: '', quadrant: null,
  startTime: '', endTime: '',
  repeat: null,
})
// 选中计划变化时重新载入草稿
const loadDetail = () => {
  const p = selected.value
  if (!p) return
  detDraft.title = p.title
  detDraft.desc = p.desc || ''
  detDraft.quadrant = p.quadrant
  detDraft.startTime = p.startTime || ''
  detDraft.endTime = p.endTime || ''
  detDraft.repeat = JSON.parse(JSON.stringify(p.repeat))
}
watch(selectedId, loadDetail, { immediate: true })
const pickDetailQuadrant = (q) => { detDraft.quadrant = q; panel.value = '' }
const saveDetail = () => {
  const p = selected.value
  if (!p || !detDraft.repeat) return
  validateEnd(detDraft)
  p.title = detDraft.title.trim() || p.title
  p.desc = detDraft.desc
  p.quadrant = detDraft.quadrant
  p.startTime = detDraft.startTime
  p.endTime = detDraft.endTime
  p.repeat = JSON.parse(JSON.stringify(detDraft.repeat))
  savePlans()
  loadDetail() // 回读校验后的值
  saveHint.value = '已保存 ✓'
  setTimeout(() => (saveHint.value = '保存'), 1200)
}
/* 删除确认 */
const confirmDeleteOpen = ref(false)
const askDelete = () => { if (selected.value) confirmDeleteOpen.value = true }
const confirmDelete = () => {
  if (!selected.value) return
  const targetId = selected.value.id
  removePlan(targetId)
  const remain = plans.value.filter((p) => planOnDate(p, selectedDate.value))
  console.log('[confirmDelete] targetId=', targetId, 'remain ids=', remain.map(p => p.id), 'setting selectedId=', remain[0]?.id ?? null)
  selectedId.value = remain[0]?.id || null
  confirmDeleteOpen.value = false
}

/* ================= 新建计划弹层 ================= */
const composerOpen = ref(false)
const cmpTab = ref('quadrant')
const cmpTitleRef = ref(null)

const emptyDraft = () => ({
  title: '',
  quadrant: null,
  startTime: '',
  endTime: '',
  repeat: {
    type: 'none',
    interval: 1,
    weekdays: [dow1(now0)],
    monthMode: 'date',
    monthDays: [now0.getDate()],
    monthWeek: 0,
    monthDow: dow1(now0),
    endDate: '',
  },
})
const draft = reactive(emptyDraft())

// q 为空表示从「空状态」进入，必须先选象限；从象限卡片 ＋ 进入则锁定
const openComposer = (q = null) => {
  Object.assign(draft, emptyDraft())
  draft.quadrant = q
  composerOpen.value = true
  cmpTab.value = q ? 'deadline' : 'quadrant'
  setTimeout(() => cmpTitleRef.value?.focus(), 30)
}
const pickComposerQuadrant = (q) => {
  draft.quadrant = q
  cmpTab.value = 'deadline'
}
const closeComposer = () => { composerOpen.value = false }
const saveComposer = () => {
  if (!draft.quadrant) { cmpTab.value = 'quadrant'; return }
  const title = draft.title.trim()
  if (!title) { cmpTitleRef.value?.focus(); return }
  validateEnd(draft)
  const plan = addPlan({
    title,
    quadrant: draft.quadrant,
    startTime: draft.startTime,
    endTime: draft.endTime,
    repeat: JSON.parse(JSON.stringify(draft.repeat)),
    date: selectedDate.value,
  })
  selectedId.value = plan.id
  composerOpen.value = false
}

/* ================= 拖拽改变象限 ================= */
const draggingId = ref(null)
const dragOverQ = ref(null)
const onDragStart = (e, p) => {
  draggingId.value = p.id
  e.dataTransfer.effectAllowed = 'move'
  try { e.dataTransfer.setData('text/plain', String(p.id)) } catch {}
}
const onDragEnd = () => {
  draggingId.value = null
  dragOverQ.value = null
}

/* 重复计划移动范围选择 */
const moveDialog = reactive({ open: false, plan: null, target: null })
const closeMoveDialog = () => {
  moveDialog.open = false
  moveDialog.plan = null
  moveDialog.target = null
  onDragEnd()
}

const onDrop = (targetQ) => {
  const p = plans.value.find((x) => x.id === draggingId.value)
  dragOverQ.value = null
  if (!p || p.quadrant === targetQ) { onDragEnd(); return }
  // 非重复计划：直接移动
  if (p.repeat.type === 'none') {
    p.quadrant = targetQ
    onDragEnd()
    return
  }
  // 重复计划：弹出范围选择
  moveDialog.open = true
  moveDialog.plan = p
  moveDialog.target = targetQ
}

const cloneRepeat = (r) => {
  const c = JSON.parse(JSON.stringify(r))
  delete c._picking
  return c
}

const applyMove = (scope) => {
  const { plan: p, target: q } = moveDialog
  if (!p || !q) { closeMoveDialog(); return }
  const dateStr = selectedDate.value

  if (scope === 'all') {
    p.quadrant = q
  } else if (scope === 'once') {
    // 原系列在该日期跳过；新建一条当天独立的计划
    if (!p.skipDates) p.skipDates = []
    if (!p.skipDates.includes(dateStr)) p.skipDates.push(dateStr)
    addPlan({
      title: p.title,
      quadrant: q,
      desc: p.desc,
      deadlineType: p.deadlineType,
      customDate: p.customDate,
      repeat: { type: 'none', interval: 1, weekdays: [], monthMode: 'date', monthDays: [], monthWeek: 0, monthDow: 1, endDate: '' },
      date: dateStr,
    })
  } else if (scope === 'future') {
    // 关键：先克隆出新系列（保留原结束时间），再把旧系列截止到前一天
    const newRepeat = cloneRepeat(p.repeat)
    const d = parseD(dateStr)
    d.setDate(d.getDate() - 1)
    const cutoff = fmt(d.getFullYear(), d.getMonth() + 1, d.getDate())
    p.repeat.endDate = cutoff
    const rest = addPlan({
      title: p.title,
      quadrant: q,
      desc: p.desc,
      deadlineType: p.deadlineType,
      customDate: p.customDate,
      repeat: newRepeat,
      date: dateStr,
    })
    selectedId.value = rest.id
  }
  savePlans()
  closeMoveDialog()
}

/* ================= 拖计划到日历：添加到指定日期 ================= */
const calDragOver = ref(null)
const dropDialog = reactive({ open: false, plan: null, date: '' })
const dropDateLabel = computed(() => {
  if (!dropDialog.date) return ''
  const d = parseD(dropDialog.date)
  return `${d.getMonth() + 1}月${d.getDate()}日`
})
const dropDialogText = computed(() => {
  const p = dropDialog.plan
  if (!p) return ''
  return `「${p.title}」将移动到 ${dropDateLabel.value}。`
})
const closeDropDialog = () => {
  dropDialog.open = false
  dropDialog.plan = null
  dropDialog.date = ''
}
const onCalDrop = (cell) => {
  calDragOver.value = null
  const p = plans.value.find((x) => x.id === draggingId.value)
  onDragEnd()
  if (!p || !cell?.date) return
  if (p.repeat.type !== 'none') {
    ElMessage.info('重复计划不能修改日期')
    return
  }
  if (p.date === cell.date) return
  dropDialog.plan = p
  dropDialog.date = cell.date
  dropDialog.open = true
}
const confirmDrop = () => {
  const p = dropDialog.plan
  const dateStr = dropDialog.date
  if (p && dateStr) {
    p.date = dateStr
    // 视图留在当前日期；若移走的正是选中计划，回退到当天其他计划
    if (selectedId.value === p.id) {
      const remain = plans.value.filter((x) => x.id !== p.id && planOnDate(x, selectedDate.value))
      selectedId.value = remain[0]?.id || plans.value.find((x) => x.id !== p.id)?.id || null
    }
    savePlans()
    ElMessage.success(`已移动到 ${dropDateLabel.value}`)
  }
  closeDropDialog()
}

/* ================= 内联子组件：重复规则配置 ================= */
const RepeatConfig = (props) => {
  const rep = props.rep
  const weekNames = ['一', '二', '三', '四', '五', '六', '日']
  const toggleArr = (arr, v) => {
    const i = arr.indexOf(v)
    if (i >= 0) arr.splice(i, 1)
    else arr.push(v)
  }
  const children = []

  if (rep.type === 'daily') {
    children.push(
      h('div', { class: 'rep-row' }, [
        h('span', { class: 'rep-row-label' }, '重复日期'),
        h('span', { class: 'rep-stepper' }, [
          h('span', { class: 'rep-step-text' }, '每'),
          h('button', { class: 'step-btn', onClick: () => (rep.interval = Math.max(1, rep.interval - 1)) }, '−'),
          h('span', { class: 'step-val' }, rep.interval),
          h('button', { class: 'step-btn', onClick: () => (rep.interval = Math.min(365, rep.interval + 1)) }, '＋'),
          h('span', { class: 'rep-step-text' }, '天重复'),
        ]),
      ])
    )
  }

  if (rep.type === 'weekly') {
    children.push(
      h('div', { class: 'rep-row' }, [
        h('span', { class: 'rep-row-label' }, '重复日期'),
        h('span', { class: 'week-picks' },
          [1, 2, 3, 4, 5, 6, 7].map((w) =>
            h('button', {
              class: 'week-pick' + (rep.weekdays.includes(w) ? ' on' : ''),
              onClick: () => toggleArr(rep.weekdays, w),
            }, weekNames[w - 1])
          )
        ),
      ])
    )
  }

  if (rep.type === 'monthly') {
    children.push(
      h('div', { class: 'seg' }, [
        h('button', { class: 'seg-btn' + (rep.monthMode === 'date' ? ' on' : ''), onClick: () => (rep.monthMode = 'date') }, '日期'),
        h('button', { class: 'seg-btn' + (rep.monthMode === 'week' ? ' on' : ''), onClick: () => (rep.monthMode = 'week') }, '星期'),
      ])
    )
    if (rep.monthMode === 'date') {
      children.push(
        h('div', { class: 'day-grid' },
          Array.from({ length: 31 }, (_, i) => i + 1).map((d) =>
            h('button', {
              class: 'day-pick' + (rep.monthDays.includes(d) ? ' on' : ''),
              onClick: () => toggleArr(rep.monthDays, d),
            }, d)
          )
        )
      )
    } else {
      children.push(
        h('div', { class: 'rep-row' }, [
          h('span', { class: 'rep-row-label' }, '第几周'),
          h('span', { class: 'week-picks' },
            ['第一', '第二', '第三', '第四', '最后'].map((t, i) =>
              h('button', {
                class: 'week-pick wide' + (rep.monthWeek === i ? ' on' : ''),
                onClick: () => (rep.monthWeek = i),
              }, t)
            )
          ),
        ]),
        h('div', { class: 'rep-row' }, [
          h('span', { class: 'rep-row-label' }, '星期'),
          h('span', { class: 'week-picks' },
            [1, 2, 3, 4, 5, 6, 7].map((w) =>
              h('button', {
                class: 'week-pick' + (rep.monthDow === w ? ' on' : ''),
                onClick: () => (rep.monthDow = w),
              }, weekNames[w - 1])
            )
          ),
        ])
      )
    }
  }

  if (rep.type !== 'none') {
    // 三态：未设置（文字按钮）→ 点击出现日期选择器 → 设置后显示日期 + 可清除
    let endCtl
    if (rep.endDate) {
      const ed = parseD(rep.endDate)
      endCtl = h('span', { class: 'end-set' }, [
        h(
          'button',
          { class: 'end-date-label', title: '重新选择结束时间', onClick: () => (rep._picking = true) },
          `${ed.getMonth() + 1}月${ed.getDate()}日`
        ),
        h(
          'button',
          { class: 'end-clear', title: '清除结束时间', onClick: () => { rep.endDate = ''; rep._picking = false } },
          '×'
        ),
      ])
    } else if (rep._picking) {
      endCtl = h('input', {
        type: 'date',
        class: 'date-ctl end-date',
        value: rep.endDate,
        onVnodeMounted: (v) => v.el && v.el.focus && v.el.focus(),
        onChange: (e) => { rep.endDate = e.target.value; rep._picking = false },
      })
    } else {
      endCtl = h(
        'button',
        { class: 'end-unset', onClick: () => (rep._picking = true) },
        '未设置结束时间 〉'
      )
    }
    children.push(
      h('div', { class: 'rep-row' }, [
        h('span', { class: 'rep-row-label' }, '结束重复'),
        endCtl,
      ])
    )
  }

  return h('div', { class: 'repeat-config' }, children)
}
RepeatConfig.props = ['rep']
</script>

<style scoped>
/* ============================================================
   时间计划 · 四象限（白底 / 墨线 / 硬投影）
   ============================================================ */
.plans {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 20px;
  gap: 16px;
  background: #fff;
}

/* ---------- hero ---------- */
.hero {
  border: 2px solid #1f1f1f;
  border-radius: 16px;
  box-shadow: 4px 4px 0 #1f1f1f;
  padding: 22px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
.hero-blue { background: #1A73E8; }
.hero-sub { margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,.85); font-weight: 500; }
.hero-left { z-index: 1; }
.hero-title { margin: 0; font-size: clamp(18px, 1.8vw, 26px); font-weight: 800; color: #fff; }
.ai-goal-btn {
  flex-shrink: 0; z-index: 1;
  background: #fff; color: #1f1f1f;
  border: 2px solid #1f1f1f; border-radius: 999px;
  font-size: 14px; font-weight: 800;
  padding: 10px 22px; cursor: pointer;
  box-shadow: 3px 3px 0 rgba(0,0,0,.9);
  transition: transform .15s ease, box-shadow .15s ease;
}
.ai-goal-btn:hover { transform: translateY(-2px); box-shadow: 4px 5px 0 rgba(0,0,0,.9); }
.ai-goal-btn:active { transform: scale(.97); box-shadow: 2px 2px 0 rgba(0,0,0,.9); }
.hero-shape { position: absolute; pointer-events: none; opacity: .25; }
.s-circle { width: 120px; height: 120px; border-radius: 50%; background: #fff; top: -30px; right: -20px; }
.s-tri {
  width: 0; height: 0;
  border-left: 50px solid transparent; border-right: 50px solid transparent; border-bottom: 80px solid #fff;
  bottom: -30px; left: 40%;
}

/* ---------- 三栏 ---------- */
.body { flex: 1; display: flex; gap: 16px; min-height: 0; }

/* ============ 左栏 ============ */
.side-left { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }

/* 历史上的今天（撑满左栏剩余高度） */
.history {
  flex: 1;
  min-height: 140px;
  border: 2px solid #1f1f1f; border-radius: 12px; box-shadow: 3px 3px 0 #1f1f1f;
  background: #fff; padding: 14px;
  display: flex; flex-direction: column;
}
.hist-head { display: flex; align-items: center; gap: 8px; }
.hist-bar { width: 4px; height: 16px; border-radius: 2px; background: #1A73E8; }
.hist-head h3 { margin: 0; font-size: 14px; font-weight: 800; }
.hist-date { margin: 8px 0 10px; font-size: 12px; font-weight: 600; color: rgba(31,31,31,.5); }
.hist-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
.hist-list li { display: flex; gap: 8px; font-size: 12.5px; line-height: 1.65; color: #1f1f1f; }
.hist-year { flex-shrink: 0; font-weight: 700; color: #1A73E8; font-size: 11.5px; padding-top: 1px; }
.hist-text { color: rgba(31,31,31,.82); }
.cal {
  border: 2px solid #1f1f1f; border-radius: 12px; box-shadow: 3px 3px 0 #1f1f1f;
  background: #fff; padding: 12px;
}
.cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.cal-nav {
  width: 26px; height: 26px; border: 1.5px solid #1f1f1f; border-radius: 8px; background: #fff;
  cursor: pointer; font-size: 16px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center;
  font-family: inherit;
}
.cal-nav:hover { background: #F6F5F0; }
.cal-title { font-size: 13px; font-weight: 700; }
.cal-week { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 11px; font-weight: 700; color: rgba(31,31,31,.5); margin-bottom: 4px; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.cal-cell {
  min-height: 38px; border-radius: 6px; cursor: pointer;
  font-size: 12px; color: #1f1f1f; display: flex; flex-direction: column; align-items: center;
  padding: 4px 0 3px; border: 1.5px solid transparent; background: #fff;
  font-family: inherit;
}
.cal-cell:hover { background: #F6F5F0; }
.cal-cell.outside { color: #c9c9c9; }
.cal-cell.today { border-color: #1A73E8; color: #1A73E8; font-weight: 700; }
.cal-cell.selected { background: #1A73E8; color: #fff; font-weight: 700; }
.cal-cell.cal-drop { border-color: #1A73E8; background: #E8F0FE; box-shadow: inset 0 0 0 1.5px #1A73E8; }
.cal-dots { display: flex; gap: 2px; margin-top: 4px; }
.cal-dot { width: 5px; height: 5px; border-radius: 50%; }
.cal-cell.selected .cal-dot { box-shadow: 0 0 0 1px rgba(255,255,255,.6); }
.cal-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; gap: 8px; }
.cal-today {
  border: 1.5px dashed rgba(31,31,31,.35); border-radius: 8px; background: transparent;
  font-size: 12px; font-weight: 700; color: rgba(31,31,31,.65); padding: 6px 10px; cursor: pointer; font-family: inherit;
}
.cal-today:hover { background: #F6F5F0; color: #1f1f1f; border-color: #1f1f1f; }
.cal-pick { font-size: 11.5px; color: #1A73E8; font-weight: 600; }

/* ============ 中间：四象限 ============ */
.quadrants { flex: 1; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 14px; min-width: 0; }
.quadrant {
  border: 2px solid #1f1f1f; border-radius: 14px; box-shadow: 3px 3px 0 #1f1f1f;
  background: #fff; display: flex; flex-direction: column; overflow: hidden; min-height: 0;
}
.q-head {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; font-weight: 700; font-size: 14px;
  border-bottom: 1.5px dashed rgba(31,31,31,.12);
}
.q-dot { width: 10px; height: 10px; border-radius: 50%; }
.q-urgent-not-important .q-dot { background: #FBBC04; }
.q-important-urgent .q-dot { background: #EA4335; }
.q-not-important-not-urgent .q-dot { background: #34A853; }
.q-important-not-urgent .q-dot { background: #1A73E8; }
.q-count { font-size: 12px; font-weight: 600; color: rgba(31,31,31,.4); }
.q-add {
  margin-left: auto; width: 26px; height: 26px; border-radius: 8px;
  border: 1.5px solid #1f1f1f; background: #fff; color: #1f1f1f;
  font-size: 17px; font-weight: 700; line-height: 1; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  opacity: 0; transform: scale(.8); transition: all .18s cubic-bezier(.34,1.56,.64,1);
  font-family: inherit;
}
.quadrant:hover .q-add { opacity: 1; transform: scale(1); }
.q-add:hover { background: #1f1f1f; color: #fff; }
.q-body { flex: 1; padding: 10px 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }

/* 计划卡片 */
.plan-chip {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border: 1.5px solid transparent;
  border-radius: 10px;
  cursor: pointer; font-size: 13.5px; color: #1f1f1f; background: #fff;
  transition: background .15s, border-color .15s, transform .15s cubic-bezier(.34,1.56,.64,1);
}
.plan-chip:hover { background: #F6F5F0; transform: translate(-1px,-1px); }

/* 复选框：描边按象限着色；勾选后填充同色 + 白勾 */
.q-urgent-not-important .chk { border-color: #FBBC04; }
.q-important-urgent .chk { border-color: #EA4335; }
.q-not-important-not-urgent .chk { border-color: #34A853; }
.q-important-not-urgent .chk { border-color: #1A73E8; }
.q-urgent-not-important .chk.checked { background: #FBBC04; }
.q-important-urgent .chk.checked { background: #EA4335; }
.q-not-important-not-urgent .chk.checked { background: #34A853; }
.q-important-not-urgent .chk.checked { background: #1A73E8; }

.q-urgent-not-important .plan-chip.selected { background: #FEF7E0; border-color: #FBBC04; }
.q-important-urgent .plan-chip.selected { background: #FCE8E6; border-color: #EA4335; }
.q-not-important-not-urgent .plan-chip.selected { background: #E6F4EA; border-color: #34A853; }
.q-important-not-urgent .plan-chip.selected { background: #E8F0FE; border-color: #1A73E8; }
.plan-chip.done .chip-title { text-decoration: line-through; color: rgba(31,31,31,.4); }
.plan-chip.dragging { opacity: .4; }
.quadrant.drag-over { background: #F6F5F0; box-shadow: 3px 3px 0 #1A73E8; border-color: #1A73E8; }
.quadrant.drag-over .q-body { outline: 2px dashed #1A73E8; outline-offset: -6px; border-radius: 10px; }
.chip-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chip-repeat {
  flex-shrink: 0; font-size: 10.5px; font-weight: 700; color: rgba(31,31,31,.45);
  border: 1px solid rgba(31,31,31,.2); border-radius: 6px; padding: 1px 6px;
}
.chip-time {
  flex-shrink: 0; font-size: 10.5px; font-weight: 800; color: #1A73E8;
  font-variant-numeric: tabular-nums;
}

/* 复选框 */
.chk {
  width: 18px; height: 18px; border: 1.5px solid #1f1f1f; border-radius: 5px;
  flex-shrink: 0; background: #fff; cursor: pointer; padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
}
.chk.sm { width: 16px; height: 16px; border-radius: 4px; }
.chk svg { display: none; }
.chk.checked svg { display: block; }
.chk.checked { background: #1f1f1f; border-color: #1f1f1f; }

.q-empty { margin: auto; font-size: 12.5px; color: rgba(31,31,31,.32); font-weight: 600; }

/* ============ 右栏：详情 ============ */
.side-right {
  width: 300px; flex-shrink: 0;
  border: 2px solid #1f1f1f; border-radius: 14px; box-shadow: 3px 3px 0 #1f1f1f;
  background: #fff; padding: 16px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto;
}
.det-title-input {
  border: none; outline: none; font-size: 17px; font-weight: 800; font-family: inherit;
  color: #1f1f1f; padding: 4px 2px; background: transparent;
}
.det-title-input:focus { border-bottom: 2px solid #1A73E8; }
.det-desc {
  min-height: 120px; resize: vertical;
  border: 1.5px dashed rgba(31,31,31,.22); border-radius: 10px;
  padding: 10px 12px; font-size: 13px; line-height: 1.7; font-family: inherit;
  color: #1f1f1f; outline: none; background: #FCFCFA;
}
.det-desc:focus { border-color: #1A73E8; background: #fff; }

/* 字段 */
.det-fields { border-top: 1.5px dashed rgba(31,31,31,.12); padding-top: 8px; display: flex; flex-direction: column; }
.det-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 4px; border-radius: 8px; cursor: pointer;
}
.det-row:hover { background: #F6F5F0; }
.det-label { font-size: 13px; color: rgba(31,31,31,.7); }
.unsaved-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #EA4335; margin-left: 6px; vertical-align: middle; }
.det-value { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.q-mark { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.arrow { color: rgba(31,31,31,.35); font-size: 16px; }

/* 内联展开编辑 */
.inline-panel {
  border: 1.5px solid rgba(31,31,31,.15); border-radius: 10px;
  padding: 10px 12px; margin: 2px 0 8px; background: #FCFCFA;
}
.panel-sub { margin: 4px 0 8px; font-size: 12px; font-weight: 700; color: rgba(31,31,31,.6); }
.opt-line { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 6px 0; cursor: pointer; }
.opt-line input { accent-color: #1f1f1f; width: 15px; height: 15px; }
.opt-line.disabled { opacity: .35; cursor: not-allowed; }
.opt-line.disabled input { cursor: not-allowed; }
.opt-line.disabled span { text-decoration: line-through; }
.panel-hint { font-size: 11px; font-weight: 500; color: rgba(31,31,31,.4); margin-left: 4px; }
.date-ctl {
  border: 1.5px solid rgba(31,31,31,.3); border-radius: 8px; padding: 6px 8px;
  font-size: 12.5px; font-family: inherit; margin: 4px 0 8px;
}
/* 当天的具体时间区间（开始–结束，结束可空） */
.time-range {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 2px 0 10px;
  padding: 8px 10px;
  background: rgba(26,115,232,.05);
  border: 1.5px dashed rgba(26,115,232,.35);
  border-radius: 10px;
}
.tr-sep { font-size: 12px; font-weight: 700; color: rgba(31,31,31,.5); }
.time-clear {
  margin-left: auto;
  border: none; background: none; padding: 2px 4px;
  font-size: 11.5px; font-weight: 700; color: rgba(31,31,31,.4);
  cursor: pointer; font-family: inherit;
}
.time-clear:hover { color: #EA4335; }
.time-ctl {
  border: 1.5px solid rgba(31,31,31,.3);
  border-radius: 8px;
  padding: 5px 8px;
  font-size: 12.5px;
  font-family: inherit;
  color: #1f1f1f;
  background: #fff;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
}
.time-ctl:hover:not(:disabled) { border-color: #1A73E8; }
.time-ctl:disabled { opacity: .4; cursor: not-allowed; }
.pick-chip {
  border: 1.5px solid rgba(31,31,31,.25); background: #fff; border-radius: 20px;
  padding: 6px 12px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit;
  display: inline-flex; align-items: center; gap: 6px; margin: 0 6px 6px 0;
}
.pick-chip.active { border-color: #1f1f1f; background: #1f1f1f; color: #fff; }
.pick-chip.active .q-mark { box-shadow: 0 0 0 1px rgba(255,255,255,.7); }

.det-save {
  margin-top: auto;
  border: 2px solid #1f1f1f; border-radius: 12px; background: #1A73E8; color: #fff;
  font-size: 14px; font-weight: 700; font-family: inherit; padding: 10px 0; cursor: pointer;
  box-shadow: 3px 3px 0 #1f1f1f;
  transition: transform .15s cubic-bezier(.34,1.56,.64,1), box-shadow .15s;
}
.det-save:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #1f1f1f; }
.det-save:active { transform: translate(2px,2px); box-shadow: 0 0 0 #1f1f1f; }

/* 删除按钮 */
.det-delete {
  border: 2px solid #EA4335; border-radius: 12px; background: #fff; color: #EA4335;
  font-size: 13px; font-weight: 700; font-family: inherit; padding: 8px 0; cursor: pointer;
}
.det-delete:hover { background: #FCE8E6; }

/* 空状态 */
.det-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: rgba(31,31,31,.4); }
.det-empty-ico { font-size: 36px; opacity: .6; }
.det-empty p { margin: 0; font-size: 13px; }
.det-empty-btn {
  border: 2px solid #1f1f1f; border-radius: 10px; background: #1A73E8; color: #fff;
  font-size: 13px; font-weight: 700; font-family: inherit; padding: 8px 18px; cursor: pointer;
  box-shadow: 3px 3px 0 #1f1f1f;
}
.det-empty-btn:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #1f1f1f; }
.det-empty-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 #1f1f1f; }

/* ============ 新建弹层 ============ */
.modal-mask {
  position: fixed; inset: 0; background: rgba(31,31,31,.32);
  display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px;
}
.composer {
  width: min(560px, 100%); max-height: 88vh; overflow-y: auto;
  background: #fff; border: 2px solid #1f1f1f; border-radius: 18px;
  box-shadow: 6px 6px 0 #1f1f1f; padding: 20px 22px;
}
.cmp-top { display: flex; align-items: center; gap: 10px; }
.cmp-title {
  flex: 1; border: none; outline: none; font-size: 17px; font-weight: 700;
  font-family: inherit; padding: 8px 4px; background: transparent;
}
.cmp-q-dot {
  width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(31,31,31,.12);
}
.cmp-q-dot.unset {
  width: 22px; height: 22px; border-radius: 50%;
  border: 1.5px dashed rgba(31,31,31,.5); background: #fff;
  color: rgba(31,31,31,.55); font-size: 12px; font-weight: 700;
  cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  box-shadow: none; font-family: inherit; padding: 0;
}
.cmp-q-dot.unset:hover { border-color: #1f1f1f; color: #1f1f1f; background: #F6F5F0; }
.tab-dot {
  width: 9px; height: 9px; border-radius: 50%;
  border: 1.5px solid currentColor; box-sizing: border-box;
}
.cmp-send {
  width: 38px; height: 38px; border-radius: 10px; border: 2px solid #1f1f1f;
  background: #fff; color: #1f1f1f; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}
.cmp-send:hover { background: #F6F5F0; transform: translate(-1px,-1px); }
.cmp-tabs { display: flex; gap: 18px; margin: 14px 0 12px; border-bottom: 1.5px dashed rgba(31,31,31,.12); padding-bottom: 12px; }
.cmp-tab {
  border: none; background: none; cursor: pointer; font-family: inherit;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  font-size: 12px; font-weight: 600; color: rgba(31,31,31,.5); padding: 4px 6px;
}
.cmp-tab.active { color: #1f1f1f; }
.cmp-tab.active svg { stroke: #1f1f1f; }
.cmp-tab svg { stroke: rgba(31,31,31,.45); }

.cmp-panel { min-height: 120px; }
.quad-pick { display: flex; flex-wrap: wrap; gap: 4px; padding-top: 4px; }
.pick-chip.big { padding: 9px 16px; font-size: 13px; }

/* 重复 chips */
.rep-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.rep-chip {
  border: 1.5px solid rgba(31,31,31,.25); background: #fff; border-radius: 20px;
  padding: 7px 16px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;
}
.rep-chip.active { border-color: #1f1f1f; background: #1f1f1f; color: #fff; }

/* 重复配置（函数式组件渲染，样式见文件末尾全局 style 块） */

/* 弹层底部 */
.cmp-foot { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }
.outline-btn, .dark-btn {
  border-radius: 22px; padding: 10px 34px; font-size: 14px; font-weight: 700;
  cursor: pointer; font-family: inherit;
}
.outline-btn { border: 2px solid #1f1f1f; background: #fff; color: #1f1f1f; }
.outline-btn:hover { background: #F6F5F0; }
.dark-btn { border: 2px solid #1f1f1f; background: #1f1f1f; color: #fff; }
.dark-btn:hover { background: #333; }

/* ============ 小确认弹层 ============ */
.mini-dialog {
  width: min(420px, 100%);
  background: #fff; border: 2px solid #1f1f1f; border-radius: 16px;
  box-shadow: 6px 6px 0 #1f1f1f; padding: 22px 24px;
}
.dlg-title { margin: 0 0 8px; font-size: 17px; font-weight: 800; }
.dlg-text { margin: 0 0 16px; font-size: 13px; line-height: 1.7; color: rgba(31,31,31,.65); }
.dlg-foot { display: flex; justify-content: flex-end; gap: 12px; }
.danger-btn {
  border: 2px solid #1f1f1f; border-radius: 22px; padding: 10px 28px;
  font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit;
  background: #EA4335; color: #fff;
  box-shadow: 3px 3px 0 #1f1f1f;
}
.danger-btn:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #1f1f1f; }
.danger-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 #1f1f1f; }

/* 移动范围选项 */
.move-opts { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.move-opt {
  text-align: left; border: 1.5px solid rgba(31,31,31,.2); border-radius: 12px;
  background: #fff; padding: 12px 14px; cursor: pointer; font-family: inherit;
  display: flex; flex-direction: column; gap: 3px;
  transition: border-color .15s, background .15s, transform .15s cubic-bezier(.34,1.56,.64,1);
}
.move-opt:hover { border-color: #1f1f1f; background: #F6F5F0; transform: translate(-1px,-1px); }
.move-opt-name { font-size: 14px; font-weight: 700; color: #1f1f1f; }
.move-opt-desc { font-size: 12px; color: rgba(31,31,31,.55); line-height: 1.5; }

/* ---------- 响应式 ---------- */
@media (max-width: 1200px) {
  /* 小屏整页滚动，靠右侧滚动条查看全部内容 */
  .plans { overflow-y: auto; }
  .body { flex: none; flex-direction: column; }
  .side-left { width: 100%; flex-direction: row; flex-wrap: wrap; overflow: visible; }
  .side-left > * { flex: 1 1 240px; }
  .quadrants { grid-template-rows: repeat(2, minmax(240px, auto)); }
  .q-body { overflow: visible; }
  .side-right { width: 100%; max-height: none; }
}
@media (max-width: 760px) {
  .quadrants { grid-template-columns: 1fr; }
  .repeat-config .day-grid { grid-template-columns: repeat(7, 1fr); }
}

/* ---------- 夜间模式（蓝色问候卡与象限彩头保持高饱和） ---------- */
html.dark .plans { background: var(--paper); color: var(--ink); }
html.dark .modal-mask { background: rgba(0, 0, 0, 0.55); }
/* 卡片表面 */
html.dark .history,
html.dark .cal,
html.dark .cal-nav,
html.dark .cal-cell,
html.dark .quadrant,
html.dark .q-add,
html.dark .plan-chip,
html.dark .chk,
html.dark .side-right,
html.dark .inline-panel,
html.dark .det-desc,
html.dark .time-ctl input,
html.dark .pick-chip,
html.dark .composer,
html.dark .cmp-title,
html.dark .rep-chip,
html.dark .outline-btn,
html.dark .mini-dialog,
html.dark .move-opt { background: var(--card); color: var(--ink); }
/* 蓝底问候卡上的白色贴纸按钮保持白底深字 */
html.dark .ai-goal-btn { background: #fff; color: #1f1f1f; }
/* 描边与投影 */
html.dark .history,
html.dark .cal,
html.dark .quadrant,
html.dark .side-right,
html.dark .composer,
html.dark .mini-dialog { box-shadow: 3px 3px 0 #000; }
html.dark .plan-chip,
html.dark .q-add,
html.dark .chk,
html.dark .ai-goal-btn,
html.dark .outline-btn { border-color: var(--ink); }
html.dark .plan-chip:hover { background: var(--hover-bg); }
/* 选中芯片：深色软底 + 浅字 + 象限彩边（原浅色软底在深色下会造成浅字浅底） */
html.dark .q-urgent-not-important .plan-chip.selected { background: var(--c-yellow-soft); border-color: var(--c-yellow); color: var(--ink); }
html.dark .q-important-urgent .plan-chip.selected { background: var(--c-red-soft); border-color: var(--c-red); color: var(--ink); }
html.dark .q-not-important-not-urgent .plan-chip.selected { background: var(--c-green-soft); border-color: var(--c-green); color: var(--ink); }
html.dark .q-important-not-urgent .plan-chip.selected { background: var(--c-blue-soft); border-color: var(--c-blue); color: var(--ink); }
/* 已完成计划文字：原 rgba(黑,.4) 在深底上不可见 */
html.dark .plan-chip.done .chip-title { color: var(--ink-55); }
html.dark .q-count,
html.dark .q-empty { color: var(--ink-40); }
html.dark .quadrant.drag-over { background: var(--hover-bg); }
/* 象限内 + 新增：hover 反转为浅底深字 */
html.dark .q-add:hover { background: #e9e9ee; color: #16161c; }
/* 完成勾选框与白天保持一致：象限彩色底 + 白勾（不加深色覆盖） */
/* 日历 */
html.dark .cal-cell { color: var(--ink); }
html.dark .cal-cell:hover { background: var(--hover-bg); }
html.dark .cal-cell.outside { color: var(--ink-25); }
html.dark .cal-cell.selected { background: var(--c-blue); color: #fff; }
html.dark .cal-cell.cal-drop { background: var(--c-blue-soft); border-color: var(--c-blue); }
html.dark .cal-week { color: var(--ink-40); }
html.dark .cal-today { border-color: var(--ink-35); color: var(--ink-55); }
html.dark .cal-today:hover { background: var(--hover-bg); color: var(--ink); border-color: var(--ink); }
/* 象限头虚线 */
html.dark .q-head { border-bottom-color: rgba(233, 233, 238, 0.14); }
/* 右侧详情 */
html.dark .det-title-input { color: var(--ink); }
html.dark .det-title-input::placeholder { color: var(--ink-35); }
html.dark .det-desc:focus { background: var(--card); }
html.dark .det-fields { border-top-color: rgba(233, 233, 238, 0.14); }
html.dark .det-row:hover { background: var(--hover-bg); }
html.dark .det-label,
html.dark .panel-sub,
html.dark .hist-date { color: var(--ink-55); }
html.dark .panel-hint,
html.dark .tr-sep,
html.dark .time-clear,
html.dark .arrow,
html.dark .det-empty { color: var(--ink-40); }
html.dark .time-clear:hover { color: var(--c-red); }
html.dark .opt-line { color: var(--ink-70); }
html.dark .opt-line input { accent-color: var(--ink); }
html.dark .inline-panel {
  border-color: var(--ink-25);
  background: var(--hover-bg);
}
html.dark .time-range {
  background: rgba(74, 140, 246, 0.12);
  border-color: rgba(74, 140, 246, 0.45);
}
html.dark .date-ctl {
  background: var(--card);
  color: var(--ink);
  border-color: var(--ink-25);
}
html.dark .date-ctl option { background: var(--card); color: var(--ink); }
html.dark .time-ctl,
html.dark .time-ctl input {
  background: var(--card);
  color: var(--ink);
  border-color: var(--ink-25);
}
html.dark .chip-repeat { color: var(--ink-40); border-color: var(--ink-25); }
/* 蓝色强调文字/链接在深底上调亮 */
html.dark .chip-time,
html.dark .hist-year,
html.dark .cal-pick { color: #7eb0f7; }
/* 删除按钮：白底翻深，hover 暗红软底 */
html.dark .det-delete { background: var(--card); }
html.dark .det-delete:hover { background: var(--c-red-soft); }
/* 弹层里的黑底白字按钮反转为浅底深字 */
html.dark .dark-btn { background: #e9e9ee; color: #16161c; }
html.dark .dark-btn:hover { background: #fff; }
html.dark .hist-list li,
html.dark .dlg-title,
html.dark .move-opt-name { color: var(--ink); }
html.dark .hist-text,
html.dark .dlg-text,
html.dark .move-opt-desc { color: var(--ink-55); }
html.dark .cmp-tab { color: var(--ink-55); }
html.dark .cmp-tab.active { color: var(--ink); }
html.dark .cmp-tab.active svg { stroke: var(--ink); }
html.dark .cmp-tab svg { stroke: var(--ink-40); }
html.dark .cmp-q-dot { box-shadow: 0 0 0 2px rgba(233, 233, 238, 0.14); }
html.dark .cmp-q-dot.unset { background: var(--card); border-color: var(--ink-35); color: var(--ink-55); }
html.dark .cmp-q-dot.unset:hover { border-color: var(--ink); color: var(--ink); background: var(--hover-bg); }
html.dark .cmp-send { background: var(--card); color: var(--ink); border-color: var(--ink); }
html.dark .cmp-send:hover { background: var(--hover-bg); }
html.dark .cmp-tabs { border-bottom-color: rgba(233, 233, 238, 0.14); }
html.dark .rep-chip { border-color: var(--ink-25); }
html.dark .rep-chip.active { background: #e9e9ee; color: #16161c; border-color: #e9e9ee; }
/* 象限选择 chip 选中态：黑底白字翻转为浅底深字 */
html.dark .pick-chip.active { background: #e9e9ee; color: #16161c; }
html.dark .pick-chip.active .q-mark { box-shadow: 0 0 0 1px rgba(22, 22, 28, 0.35); }
</style>

<style>
/* 非 scoped：RepeatConfig 由 h() 渲染，元素不带 scoped 标记 */
.repeat-config .rep-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 0; border-top: 1.5px dashed rgba(31,31,31,.1); flex-wrap: wrap; gap: 8px;
}
.repeat-config .rep-row-label {
  font-size: 13px; font-weight: 600; color: rgba(31,31,31,.75);
  display: flex; align-items: center; gap: 6px;
}
.repeat-config .rep-stepper { display: flex; align-items: center; gap: 8px; font-size: 13px; color: rgba(31,31,31,.7); }
.repeat-config .step-btn {
  width: 28px; height: 28px; border-radius: 8px; border: 1.5px solid rgba(31,31,31,.25);
  background: #F6F5F0; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit;
}
.repeat-config .step-btn:hover { border-color: #1f1f1f; }
.repeat-config .step-val { min-width: 24px; text-align: center; font-weight: 700; font-size: 14px; }
.repeat-config .week-picks { display: flex; gap: 6px; flex-wrap: wrap; }
.repeat-config .week-pick {
  width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid rgba(31,31,31,.25);
  background: #fff; font-size: 12.5px; cursor: pointer; font-family: inherit; font-weight: 600;
}
.repeat-config .week-pick.wide { width: auto; padding: 0 12px; border-radius: 16px; }
.repeat-config .week-pick.on { background: #1f1f1f; color: #fff; border-color: #1f1f1f; }
.repeat-config .seg {
  display: inline-flex; border: 1.5px solid rgba(31,31,31,.25); border-radius: 8px;
  overflow: hidden; margin-bottom: 10px;
}
.repeat-config .seg-btn {
  border: none; background: #fff; padding: 6px 18px; font-size: 12.5px; font-weight: 600;
  cursor: pointer; font-family: inherit;
}
.repeat-config .seg-btn.on { background: #1f1f1f; color: #fff; }
.repeat-config .day-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px; margin-bottom: 8px; }
.repeat-config .day-pick {
  aspect-ratio: 1; border: 1.5px solid rgba(31,31,31,.2); border-radius: 8px;
  background: #fff; font-size: 12px; cursor: pointer; font-family: inherit;
}
.repeat-config .day-pick:hover { border-color: #1f1f1f; }
.repeat-config .day-pick.on { background: #1f1f1f; color: #fff; border-color: #1f1f1f; }
.repeat-config .end-date { margin: 0; }
.repeat-config .end-unset {
  border: none; background: none; cursor: pointer; font-family: inherit;
  font-size: 13px; color: rgba(31,31,31,.45); padding: 4px 0;
}
.repeat-config .end-unset:hover { color: #1f1f1f; }
.repeat-config .end-set { display: inline-flex; align-items: center; gap: 6px; }
.repeat-config .end-date-label {
  border: 1.5px solid #1f1f1f; border-radius: 8px; background: #fff;
  font-size: 12.5px; font-weight: 600; font-family: inherit;
  padding: 5px 12px; cursor: pointer;
}
.repeat-config .end-date-label:hover { background: #F6F5F0; }
.repeat-config .end-clear {
  width: 24px; height: 24px; border-radius: 6px; border: none; background: transparent;
  color: rgba(31,31,31,.4); font-size: 16px; cursor: pointer; font-family: inherit; line-height: 1;
}
.repeat-config .end-clear:hover { background: #FCE8E6; color: #EA4335; }

/* ---------- 夜间模式（非 scoped：h() 渲染元素无 data-v 标记） ---------- */
html.dark .repeat-config .rep-row { border-top-color: rgba(233,233,238,.12); }
html.dark .repeat-config .rep-row-label { color: var(--ink-70); }
html.dark .repeat-config .rep-stepper { color: var(--ink-70); }
html.dark .repeat-config .step-btn,
html.dark .repeat-config .week-pick,
html.dark .repeat-config .seg-btn,
html.dark .repeat-config .day-pick,
html.dark .repeat-config .end-date-label {
  background: var(--card); color: var(--ink); border-color: var(--ink-25);
}
html.dark .repeat-config .step-btn:hover,
html.dark .repeat-config .week-pick:hover,
html.dark .repeat-config .day-pick:hover { border-color: var(--ink); }
html.dark .repeat-config .week-pick.on,
html.dark .repeat-config .seg-btn.on,
html.dark .repeat-config .day-pick.on { background: #e9e9ee; color: #16161c; border-color: #e9e9ee; }
html.dark .repeat-config .end-date-label { border-color: var(--ink); }
html.dark .repeat-config .end-date-label:hover { background: var(--hover-bg); }
html.dark .repeat-config .end-unset { color: var(--ink-40); }
html.dark .repeat-config .end-unset:hover { color: var(--ink); }
html.dark .repeat-config .end-clear { color: var(--ink-40); }
html.dark .repeat-config .end-clear:hover { background: var(--c-red-soft); color: var(--c-red); }
</style>
