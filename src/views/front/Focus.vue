<template>
  <div class="focus-page">
    <!-- ① 绿色问候卡 -->
    <div class="hero hero-green">
      <div class="hero-left">
        <h1 class="hero-title">把这一刻，只留给眼前的事</h1>
        <p class="hero-sub">先深呼吸三次，从一件小事开始，剩下的交给时间。</p>
      </div>
    
      <span class="hero-shape s-circle" aria-hidden="true"></span>
      <span class="hero-shape s-tri" aria-hidden="true"></span>

      <!-- 配乐弹层 -->
      <div v-if="musicOpen" class="pop-mask" @click="musicOpen = false"></div>
      <div v-if="musicOpen" class="pop music-pop">
        <p class="pop-title">背景配乐</p>
        <button
          v-for="m in musicOptions"
          :key="m.key"
          class="music-opt"
          :class="{ active: musicType === m.key }"
          @click="pickMusic(m.key)"
        >
          <span class="mo-ico">{{ m.ico }}</span>
          <span class="mo-name">{{ m.name }}</span>
          <span class="mo-desc">{{ m.desc }}</span>
        </button>
      </div>
    </div>

    <!-- ② 计时主区 -->
    <div class="stage">
      <!-- 选择专注计划：下拉选已有计划 / 铅笔自定义名字 -->
      <div class="picker">
        <template v-if="!editingName">
          <button class="pick-btn" :disabled="phase !== 'idle' && phase !== 'done'" @click="pickerOpen = !pickerOpen">
            <span class="pick-label" :class="{ placeholder: !finalTitle }">{{ finalTitle || '选择专注计划' }}</span>
            <svg class="pick-caret" :class="{ up: pickerOpen }" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <button class="pencil-btn" :disabled="phase !== 'idle' && phase !== 'done'" title="自定义专注名字" @click="startEdit">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>

          <div v-if="pickerOpen" class="pick-mask" @click="pickerOpen = false"></div>
          <div v-if="pickerOpen" class="pick-menu">
            <div class="pick-list">
              <button
                v-for="p in todayPlans"
                :key="p.id"
                class="pick-item"
                :class="{ sel: timerState.taskId === p.id }"
                @click="pickPlan(p)"
              >
                <span class="pi-dot" :style="{ background: quadrantColors[p.quadrant] }"></span>
                <span class="pi-title">{{ p.title }}</span>
                <span v-if="isDoneOn(p, mkDate(0))" class="pi-done">✓</span>
              </button>
              <p v-if="!todayPlans.length" class="pick-empty">今天还没有计划，也可以直接开始</p>
            </div>
          </div>
        </template>

        <!-- 铅笔编辑态：图标 + 输入框 + 叉号 -->
        <template v-else>
          <span class="edit-pencil">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </span>
          <input
            ref="nameInputEl"
            v-model="nameDraft"
            class="pick-input"
            placeholder="输入这次专注的名字，回车确认"
            maxlength="30"
            @keydown.enter="confirmName"
            @keydown.esc="cancelEdit"
          />
          <button class="x-btn" title="取消" @click="cancelEdit">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </template>
      </div>

      <!-- 时钟 -->
      <div class="clock-wrap">
        <div class="ring-box" @click="(phase === 'idle' || phase === 'done') && (durOpen = true)">
          <svg class="ring" viewBox="0 0 280 280">
            <circle class="ring-bg" cx="140" cy="140" r="124" />
            <circle
              class="ring-fg"
              cx="140" cy="140" r="124"
              :style="{ strokeDasharray: RING_LEN, strokeDashoffset: dashOffset }"
            />
          </svg>
          <div class="ring-center" :class="{ clickable: phase === 'idle' || phase === 'done' }">
            <span class="ring-time">{{ timeText }}</span>
          </div>
        </div>

        <!-- 时长选择弹层 -->
        <div v-if="durOpen" class="pop-mask" @click="durOpen = false"></div>
        <div v-if="durOpen" class="pop dur-pop">
          <p class="pop-title">专注时长</p>
          <div class="dur-grid">
            <button
              v-for="d in presets"
              :key="d"
              class="dur-cell"
              :class="{ active: minutes === d }"
              @click="pickDuration(d)"
            >{{ d }}<small>分钟</small></button>
          </div>
          <div class="dur-custom">
            <input v-model="customMin" type="number" min="3" max="180" class="dur-input" placeholder="自定义" />
            <span class="dur-unit">分钟</span>
            <button class="dur-go" @click="applyCustom">确定</button>
          </div>
          <p v-if="durError" class="pop-error">{{ durError }}</p>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="controls">
        <button
          v-if="phase === 'idle' || phase === 'done'"
          class="ctl primary"
          :disabled="editingName"
          :title="editingName ? '请先确定专注名字' : ''"
          @click="startFocus"
        >
          {{ editingName ? '请先确定专注名字' : '开始专注' }}
        </button>
        <template v-if="phase === 'running' || phase === 'paused'">
          <button class="ctl primary" @click="togglePause">
            {{ phase === 'running' ? '❚❚ 暂停' : '▶ 继续' }}
          </button>
          <button class="ctl ghost" @click="askEnd">结束</button>
        </template>
      </div>
    </div>

    <!-- ③ 今日专注记录 -->
    <div class="today">
      <div class="today-head">
        <h2>今日专注 · {{ todayStats.rounds }} 轮 / {{ fmtDur(todayStats.totalSec) }}</h2>
      </div>
      <div v-if="todayStats.list.length" class="session-list">
        <div v-for="s in [...todayStats.list].reverse().slice(0, 6)" :key="s.id" class="sess">
          <span class="sess-ico">{{ s.completed ? '✓' : '◔' }}</span>
          <span class="sess-min">{{ s.plannedMin }} 分钟</span>
          <span class="sess-title">{{ s.taskTitle || '自由专注' }}</span>
          <span class="sess-time">{{ clockLabel(s.startedAt) }}</span>
        </div>
      </div>
      <p v-else class="today-empty">还没有专注记录，先来一轮吧。</p>
    </div>

    <!-- 提前结束确认 -->
    <div v-if="endConfirm" class="modal-mask" @click.self="endConfirm = false">
      <div class="mini-dialog">
        <h3 class="dlg-title">提前结束这次专注？</h3>
        <p class="dlg-text">
          已专注 {{ fmtDur(elapsedSec) }}，
          {{ elapsedSec < 180 ? '不足 3 分钟，这次专注不会被记录。' : '结束后本次将记为未完成。' }}
        </p>
        <div class="dlg-foot">
          <button class="outline-btn" @click="endConfirm = false">继续专注</button>
          <button class="danger-btn" @click="endFocus">{{ elapsedSec < 180 ? '确认结束' : '结束并记录' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import { plansOn, mkDate, quadrantColors, isDoneOn } from '@/utils/plansStore'
import {
  todayFocus,
  timerState,
  setFocusMinutes,
  setTaskSelection,
  startFocus as storeStart,
  pauseFocus,
  resumeFocus,
  endFocusEarly,
} from '@/utils/focusStore'

/* ================= 运行态（模块级单例，跨页面/刷新持续走时） ================= */
const phase = computed(() => timerState.phase)
const minutes = computed(() => timerState.minutes)
const remainingSec = computed(() => timerState.remainingSec)
const plannedSec = computed(() => timerState.minutes * 60)
const elapsedSec = computed(() => plannedSec.value - remainingSec.value)

const timeText = computed(() => {
  const s = Math.max(0, remainingSec.value)
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
})
const RING_LEN = 2 * Math.PI * 124
const dashOffset = computed(() => RING_LEN * (1 - remainingSec.value / plannedSec.value))

/* ================= 专注计划选择（预选也持久化） ================= */
const todayPlans = computed(() => plansOn(mkDate(0)))
const finalTitle = computed(() => timerState.taskTitle || '')

const pickerOpen = ref(false)
const pickPlan = (p) => {
  setTaskSelection(p.id, p.title)
  pickerOpen.value = false
}

/* 铅笔编辑态：铅笔+输入框+叉号；叉号/回车退出回到 选择专注计划 | 铅笔 */
const editingName = ref(false)
const nameDraft = ref('')
const nameInputEl = ref(null)
const startEdit = () => {
  nameDraft.value = timerState.taskId === null ? timerState.taskTitle : ''
  editingName.value = true
  pickerOpen.value = false
  nextTick(() => nameInputEl.value?.focus())
}
const confirmName = () => {
  const v = nameDraft.value.trim()
  if (v) setTaskSelection(null, v)
  editingName.value = false
}
const cancelEdit = () => {
  nameDraft.value = ''
  editingName.value = false
}

/* ================= 时长 ================= */
const presets = [3, 15, 25, 30, 45, 60]
const durOpen = ref(false)
const customMin = ref('3')
const durError = ref('')
const pickDuration = (d) => {
  setFocusMinutes(d)
  durOpen.value = false
}
const applyCustom = () => {
  const n = Number(customMin.value)
  if (!Number.isFinite(n) || n < 3 || n > 180) { durError.value = '请输入 3–180 之间的分钟数'; return }
  setFocusMinutes(Math.round(n))
  durOpen.value = false
  customMin.value = '3'
  durError.value = ''
}

/* ================= 控制 ================= */
const startFocus = () => {
  storeStart({ taskId: timerState.taskId, taskTitle: timerState.taskTitle })
}
const togglePause = () => {
  if (timerState.phase === 'running') pauseFocus()
  else if (timerState.phase === 'paused') resumeFocus()
}
const endConfirm = ref(false)
const askEnd = () => { endConfirm.value = true }
const endFocus = () => {
  endFocusEarly()
  endConfirm.value = false
}

/* ================= 展示工具 ================= */
const fmtDur = (sec) => {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h) return `${h}小时${m}分`
  if (m) return `${m}分${s ? s + '秒' : ''}`
  return `${s}秒`
}
const clockLabel = (ts) => {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const todayStats = todayFocus

/* ================= 配乐（WebAudio 合成，无外部资源） ================= */
const musicOptions = [
  { key: 'off', name: '静音', desc: '安安静静', ico: '○' },
  { key: 'rain', name: '雨声', desc: '低通白噪', ico: '☔' },
  { key: 'white', name: '白噪音', desc: '均匀声浪', ico: '～' },
  { key: 'chime', name: '风铃', desc: '五声音阶', ico: '♪' },
]
const musicOpen = ref(false)
const musicType = ref('off')
const musicLabel = computed(() => musicOptions.find((m) => m.key === musicType.value)?.name || '配乐')
let audioCtx = null
let ambientStop = null

const ensureCtx = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}
const makeNoiseBuffer = (ctx) => {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buf
}
const startNoise = (type) => {
  const ctx = ensureCtx()
  const src = ctx.createBufferSource()
  src.buffer = makeNoiseBuffer(ctx)
  src.loop = true
  const gain = ctx.createGain()
  if (type === 'rain') {
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 950
    src.connect(lp); lp.connect(gain)
    gain.gain.value = 0.14
    // 缓慢起伏模拟雨声疏密
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.value = 0.13
    lfoGain.gain.value = 0.045
    lfo.connect(lfoGain); lfoGain.connect(gain.gain)
    lfo.start()
    src._lfo = lfo
  } else {
    src.connect(gain)
    gain.gain.value = 0.05
  }
  src.start()
  return () => {
    try { src._lfo?.stop(); src.stop() } catch {}
    try { gain.disconnect() } catch {}
  }
}
const startChime = () => {
  const ctx = ensureCtx()
  const master = ctx.createGain()
  master.gain.value = 0.22
  master.connect(ctx.destination)
  // 五声音阶（C 大调宫调）随机风铃
  const notes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]
  let alive = true
  const ping = () => {
    if (!alive) return
    const f = notes[Math.floor(Math.random() * notes.length)]
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = f
    const t = ctx.currentTime
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.5, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.6)
    osc.connect(g); g.connect(master)
    osc.start(t); osc.stop(t + 2.8)
    setTimeout(ping, 1400 + Math.random() * 2600)
  }
  ping()
  return () => { alive = false; try { master.disconnect() } catch {} }
}
const pickMusic = (key) => {
  if (ambientStop) { ambientStop(); ambientStop = null }
  if (key !== 'off') {
    ambientStop = key === 'chime' ? startChime() : startNoise(key)
  }
  musicType.value = key
  musicOpen.value = false
}
onBeforeUnmount(() => { if (ambientStop) ambientStop() })
</script>

<style scoped>
.focus-page {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  padding-bottom: 32px;
  background: #fff;
}

/* ---------- ① 问候卡 ---------- */
.hero {
  border: 2px solid #1f1f1f; border-radius: 16px; box-shadow: 4px 4px 0 #1f1f1f;
  padding: 22px 28px;
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  position: relative; overflow: hidden; flex-shrink: 0;
}
.hero-green { background: #34A853; }
.hero-left { z-index: 1; }
.hero-title { margin: 0; font-size: clamp(18px, 1.8vw, 26px); font-weight: 800; color: #fff; }
.hero-sub { margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,.85); font-weight: 500; }
.hero-right { z-index: 1; flex-shrink: 0; position: relative; }
.music-btn {
  display: inline-flex; align-items: center; gap: 7px;
  border: 2px solid #1f1f1f; border-radius: 999px;
  background: #fff; color: #1f1f1f;
  padding: 9px 20px; font-size: 13.5px; font-weight: 800; font-family: inherit;
  cursor: pointer; box-shadow: 3px 3px 0 #1f1f1f;
  transition: transform .15s cubic-bezier(.34,1.56,.64,1);
}
.music-btn:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #1f1f1f; }
.music-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 #1f1f1f; }
.music-btn.on { background: #1f1f1f; color: #fff; }
.hero-shape { position: absolute; pointer-events: none; opacity: .2; }
.s-circle { width: 110px; height: 110px; border-radius: 50%; background: #fff; top: -36px; right: 30%; }
.s-tri {
  width: 0; height: 0;
  border-left: 40px solid transparent; border-right: 40px solid transparent; border-bottom: 66px solid #fff;
  bottom: -28px; right: 6%;
}

/* 弹层通用 */
.pop-mask { position: fixed; inset: 0; z-index: 40; }
.pop {
  position: absolute; z-index: 41;
  background: #fff; border: 2px solid #1f1f1f; border-radius: 14px;
  box-shadow: 4px 4px 0 #1f1f1f; padding: 14px;
}
.music-pop { top: calc(100% + 10px); right: 0; width: 240px; }
.pop-title { margin: 0 0 10px; font-size: 13px; font-weight: 800; color: rgba(31,31,31,.55); }
.music-opt {
  width: 100%; display: grid;
  grid-template-columns: 28px 1fr; align-items: center; column-gap: 8px;
  border: 1.5px solid transparent; border-radius: 10px;
  background: #fff; padding: 8px 10px; cursor: pointer; font-family: inherit; text-align: left;
  margin-bottom: 4px;
}
.music-opt:hover { background: #F6F5F0; }
.music-opt.active { border-color: #34A853; background: #E6F4EA; }
.mo-ico { grid-row: span 2; font-size: 18px; text-align: center; }
.mo-name { font-size: 13.5px; font-weight: 800; }
.mo-desc { font-size: 11px; color: rgba(31,31,31,.5); }
.pop-error { margin: 6px 0 0; font-size: 12px; color: #EA4335; font-weight: 700; }

/* ---------- ② 计时主区 ---------- */
.stage {
  flex: 0 0 auto;
  border: 2px solid #1f1f1f; border-radius: 16px; box-shadow: 3px 3px 0 #1f1f1f;
  background: #FCFCFA;
  display: flex; flex-direction: column; align-items: center;
  padding: 22px 20px 26px; gap: 20px;
}

/* 选择专注计划 */
.picker {
  position: relative;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  min-height: 44px;
}
.pick-btn {
  display: inline-flex; align-items: center; gap: 8px;
  border: 2px solid #1f1f1f; border-radius: 999px;
  background: #fff; color: #1f1f1f;
  padding: 10px 24px; font-size: 16px; font-weight: 800; font-family: inherit;
  cursor: pointer; box-shadow: 3px 3px 0 #1f1f1f;
  transition: transform .15s cubic-bezier(.34,1.56,.64,1);
}
.pick-btn:hover:not(:disabled) { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #1f1f1f; }
.pick-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 #1f1f1f; }
.pick-btn:disabled { cursor: not-allowed; opacity: .6; }
.pick-label.placeholder { color: rgba(31,31,31,.45); font-weight: 700; }
.pick-caret { transition: transform .2s ease; flex-shrink: 0; }
.pick-caret.up { transform: rotate(180deg); }

.pencil-btn {
  width: 40px; height: 40px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border: 2px solid #1f1f1f; border-radius: 50%;
  background: #fff; color: #1f1f1f; cursor: pointer;
  box-shadow: 3px 3px 0 #1f1f1f;
  transition: transform .15s cubic-bezier(.34,1.56,.64,1);
}
.pencil-btn:hover:not(:disabled) { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #1f1f1f; }
.pencil-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 #1f1f1f; }
.pencil-btn:disabled { cursor: not-allowed; opacity: .6; }

.pick-mask { position: fixed; inset: 0; z-index: 40; }
.pick-menu {
  position: absolute; top: calc(100% + 14px); left: 50%; transform: translateX(-50%);
  z-index: 41; width: 260px;
  background: #fff; border: 2px solid #1f1f1f; border-radius: 16px;
  box-shadow: 5px 5px 0 #1f1f1f; padding: 8px;
}
.pick-menu::before {
  content: ''; position: absolute; top: -9px; left: 50%; transform: translateX(-50%) rotate(45deg);
  width: 14px; height: 14px; background: #fff;
  border-left: 2px solid #1f1f1f; border-top: 2px solid #1f1f1f;
}
.pick-list { display: flex; flex-direction: column; gap: 2px; max-height: 264px; overflow-y: auto; }
.pick-item {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 9px;
  border: 1.5px solid transparent; border-radius: 10px;
  background: #fff; padding: 10px 12px; cursor: pointer;
  font-family: inherit; text-align: left; color: #1f1f1f;
  transition: background .15s, border-color .15s;
}
.pick-item:hover { background: #F6F5F0; }
.pick-item.sel { border-color: #34A853; background: #E6F4EA; }
.pi-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; border: 1px solid rgba(31,31,31,.3); }
.pi-title { flex: 1; font-size: 13.5px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pi-done { color: #34A853; font-weight: 800; font-size: 13px; }
.pi-date { font-size: 11.5px; color: rgba(31,31,31,.45); flex-shrink: 0; }
.pick-empty { margin: 10px 6px; font-size: 12.5px; color: rgba(31,31,31,.42); text-align: center; }

/* 铅笔编辑态 */
.edit-pencil {
  width: 40px; height: 40px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border: 2px solid #1f1f1f; border-radius: 50%;
  background: #E6F4EA; color: #34A853; box-shadow: 3px 3px 0 #1f1f1f;
}
.pick-input {
  width: min(300px, 60vw);
  border: 2px solid #1f1f1f; border-radius: 999px;
  padding: 10px 20px; font-size: 15px; font-weight: 700; font-family: inherit;
  outline: none; background: #fff; box-shadow: 3px 3px 0 #1f1f1f;
}
.pick-input:focus { border-color: #34A853; }
.x-btn {
  width: 40px; height: 40px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border: 2px solid #1f1f1f; border-radius: 50%;
  background: #fff; color: #1f1f1f; cursor: pointer; box-shadow: 3px 3px 0 #1f1f1f;
  transition: transform .15s cubic-bezier(.34,1.56,.64,1);
}
.x-btn:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #1f1f1f; background: #FCEBEA; }
.x-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 #1f1f1f; }

/* 时钟 */
.clock-wrap { position: relative; }
.ring-box { position: relative; width: 280px; height: 280px; cursor: default; }
.ring-box .ring-center.clickable { cursor: pointer; }
.ring { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-bg { fill: none; stroke: rgba(31,31,31,.08); stroke-width: 12; }
.ring-fg {
  fill: none; stroke: #34A853; stroke-width: 12; stroke-linecap: round;
  transition: stroke-dashoffset .3s linear;
}
.ring-center {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
}
.ring-time { font-size: 64px; font-weight: 800; letter-spacing: -0.02em; color: #1f1f1f; font-variant-numeric: tabular-nums; }

/* 时长弹层 */
.dur-pop { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; position: absolute; }
.dur-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.dur-cell {
  border: 2px solid rgba(31,31,31,.2); border-radius: 12px; background: #fff;
  font-size: 20px; font-weight: 800; color: #1f1f1f;
  padding: 12px 0; cursor: pointer; font-family: inherit;
  display: flex; flex-direction: column; align-items: center; gap: 1px;
}
.dur-cell small { font-size: 11px; font-weight: 600; color: rgba(31,31,31,.5); }
.dur-cell:hover { border-color: #1f1f1f; }
.dur-cell.active { background: #34A853; border-color: #1f1f1f; color: #fff; box-shadow: 2px 2px 0 #1f1f1f; }
.dur-cell.active small { color: rgba(255,255,255,.85); }
.dur-custom { display: flex; align-items: center; gap: 8px; }
.dur-input {
  flex: 1; min-width: 0; border: 2px solid rgba(31,31,31,.25); border-radius: 10px;
  padding: 8px 10px; font-size: 14px; font-weight: 700; font-family: inherit; outline: none;
}
.dur-input:focus { border-color: #34A853; }
.dur-unit { font-size: 12.5px; color: rgba(31,31,31,.55); white-space: nowrap; }
.dur-go {
  border: 2px solid #1f1f1f; border-radius: 10px; background: #1f1f1f; color: #fff;
  font-size: 13px; font-weight: 800; font-family: inherit; padding: 8px 16px; cursor: pointer;
}

/* 控制按钮 */
.controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: center; }
.ctl {
  border: 2px solid #1f1f1f; border-radius: 999px;
  padding: 13px 56px; font-size: 16px; font-weight: 800; font-family: inherit; cursor: pointer;
}
.ctl.primary { background: #34A853; color: #fff; box-shadow: 3px 3px 0 #1f1f1f; }
.ctl.primary:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #1f1f1f; }
.ctl.primary:active { transform: translate(2px,2px); box-shadow: 0 0 0 #1f1f1f; }
.ctl.primary:disabled {
  background: #9CC9A8;
  color: rgba(255,255,255,.9);
  cursor: not-allowed;
  box-shadow: 3px 3px 0 rgba(31,31,31,.4);
  transform: none;
}
.ctl.primary:disabled:hover { transform: none; box-shadow: 3px 3px 0 rgba(31,31,31,.4); }
.ctl.ghost { background: #fff; color: #1f1f1f; padding: 13px 30px; }
.ctl.ghost:hover { background: #F6F5F0; }

/* ---------- ③ 今日记录 ---------- */
.today {
  flex-shrink: 0;
  border: 2px solid #1f1f1f; border-radius: 14px; box-shadow: 3px 3px 0 #1f1f1f;
  background: #fff; padding: 14px 18px;
}
.today-head h2 { margin: 0 0 10px; font-size: 14px; font-weight: 800; }
.session-list { display: flex; flex-direction: column; gap: 6px; }
.sess {
  display: flex; align-items: center; gap: 10px;
  border: 1.5px dashed rgba(31,31,31,.18); border-radius: 10px;
  padding: 8px 12px; font-size: 13px;
}
.sess-ico {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  background: #34A853; color: #fff; font-size: 12px; font-weight: 800;
  display: inline-flex; align-items: center; justify-content: center;
}
.sess-min { font-weight: 800; flex-shrink: 0; }
.sess-title { flex: 1; color: rgba(31,31,31,.72); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sess-time { font-size: 12px; color: rgba(31,31,31,.45); flex-shrink: 0; }
.today-empty { margin: 0; font-size: 12.5px; color: rgba(31,31,31,.38); }

/* 结束确认弹层 */
.modal-mask {
  position: fixed; inset: 0; background: rgba(31,31,31,.32);
  display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px;
}
.mini-dialog {
  width: min(420px, 100%);
  background: #fff; border: 2px solid #1f1f1f; border-radius: 16px;
  box-shadow: 6px 6px 0 #1f1f1f; padding: 22px 24px;
}
.dlg-title { margin: 0 0 8px; font-size: 17px; font-weight: 800; }
.dlg-text { margin: 0 0 16px; font-size: 13px; line-height: 1.7; color: rgba(31,31,31,.65); }
.dlg-foot { display: flex; justify-content: flex-end; gap: 12px; }
.outline-btn, .danger-btn {
  border-radius: 22px; padding: 9px 26px; font-size: 14px; font-weight: 700;
  cursor: pointer; font-family: inherit;
}
.outline-btn { border: 2px solid #1f1f1f; background: #fff; color: #1f1f1f; }
.outline-btn:hover { background: #F6F5F0; }
.danger-btn { border: 2px solid #1f1f1f; background: #EA4335; color: #fff; box-shadow: 3px 3px 0 #1f1f1f; }
.danger-btn:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #1f1f1f; }
.danger-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 #1f1f1f; }

@media (max-width: 760px) {
  .hero { flex-direction: column; align-items: flex-start; }
  .ring-box { width: 240px; height: 240px; }
  .ring-time { font-size: 44px; }
}

/* ---------- 夜间模式（黄色问候卡与绿色主按钮保持高饱和） ---------- */
html.dark .focus-page { background: var(--paper); color: var(--ink); }
html.dark .modal-mask { background: rgba(0, 0, 0, 0.55); }
html.dark .pop,
html.dark .music-opt,
html.dark .stage,
html.dark .pick-btn,
html.dark .pencil-btn,
html.dark .x-btn,
html.dark .pick-menu,
html.dark .pick-item,
html.dark .pick-input,
html.dark .dur-cell,
html.dark .dur-input,
html.dark .ctl.ghost,
html.dark .today,
html.dark .mini-dialog,
html.dark .outline-btn { background: var(--card); color: var(--ink); }
html.dark .pick-menu::before { background: var(--card); }
html.dark .music-opt:hover,
html.dark .pick-item:hover,
html.dark .ctl.ghost:hover,
html.dark .outline-btn:hover { background: var(--hover-bg); }
/* 计划选择器：墨线描边/硬投影/占位文字在深色下翻转 */
html.dark .stage { border-color: var(--ink); box-shadow: 3px 3px 0 #000; }
html.dark .pick-btn,
html.dark .pencil-btn {
  border-color: var(--ink);
  box-shadow: 3px 3px 0 #000;
}
html.dark .pick-btn:hover:not(:disabled),
html.dark .pencil-btn:hover:not(:disabled) { box-shadow: 4px 4px 0 #000; }
html.dark .pick-label.placeholder { color: var(--ink-55); }
html.dark .pick-menu { border-color: var(--ink); box-shadow: 5px 5px 0 #000; }
html.dark .pick-menu::before { border-color: var(--ink); }
html.dark .pick-item.sel { background: var(--c-green-soft); border-color: var(--c-green); }
html.dark .pi-dot { border-color: var(--ink-25); }
html.dark .pi-date,
html.dark .pick-empty { color: var(--ink-40); }
html.dark .edit-pencil {
  background: var(--c-green-soft);
  color: #6fd088;
  border-color: var(--ink);
  box-shadow: 3px 3px 0 #000;
}
html.dark .x-btn { border-color: var(--ink); box-shadow: 3px 3px 0 #000; }
/* 黑底白字的小控件在深色下反转为浅底深字 */
html.dark .music-btn.on,
html.dark .dur-go { background: #e9e9ee; color: #16161c; }
/* 描边/文字 */
html.dark .pick-input,
html.dark .dur-input { border-color: var(--ink-25); }
html.dark .dur-cell { border-color: var(--ink-25); }
html.dark .ring-time,
html.dark .today-head h2,
html.dark .dlg-title { color: var(--ink); }
html.dark .sess { border-color: var(--ink-25); }
html.dark .sess-title,
html.dark .dlg-text { color: var(--ink-55); }
html.dark .sess-time,
html.dark .today-empty,
html.dark .dur-unit,
html.dark .dur-cell small { color: var(--ink-40); }
html.dark .ring-bg { stroke: rgba(233, 233, 238, 0.12); }
html.dark .x-btn:hover { background: var(--c-red-soft); }
</style>
