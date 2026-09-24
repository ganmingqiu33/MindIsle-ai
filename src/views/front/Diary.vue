<template>
  <div class="diary">
    <!-- ① 红色问候卡 -->
    <div class="hero hero-red">
      <div class="hero-left">
        <h1 class="hero-title">{{ view === 'today' ? '记录一下现在的心情吧！' : '过去的足迹' }}</h1>
        <p class="hero-sub">{{ view === 'today' ? '记录下今天的心情，记录下今天发生的事情' : '查看过去的足迹，记录下过去的发生的事情' }}</p>
      </div>
      <div class="hero-actions">
        <template v-if="view === 'today'">
          <button class="hero-btn solid" @click="openDiary()">
            <span class="hb-plus">＋</span>写日记
          </button>
          <button class="hero-btn ghost" @click="openReview()">
            <span class="hb-plus">＋</span>复盘笔记
          </button>
        </template>
        <button class="hero-btn ghost" @click="toggleView">
          {{ view === 'today' ? '☰ 历史记录' : '‹ 返回今天' }}
        </button>
      </div>
      <span class="hero-shape s-circle" aria-hidden="true"></span>
      <span class="hero-shape s-tri" aria-hidden="true"></span>
    </div>

    <!-- ② 记录区：今天 / 历史列表 -->
    <div class="records">
      <section v-for="g in groups" :key="g.date" class="date-group">
        <h3 class="group-date">
          <span class="gd-text">{{ fullDateLabel(g.date) }}</span>
          <span v-if="g.date === todayStr" class="gd-tag">今天</span>
        </h3>

        <!-- 心情日记卡 -->
        <div v-if="g.diary" class="rec-card diary-card">
          <div class="rec-head">
            <span class="rec-mood">
              <span class="rec-emoji">{{ moodInfo(g.diary.mood)?.emoji }}</span>
              <span class="rec-label" :style="{ color: moodInfo(g.diary.mood)?.color }">
                {{ moodInfo(g.diary.mood)?.label }}
              </span>
            </span>
            <div class="rec-tools">
              <button class="tool-btn" @click="openDiary(g.date)">编辑</button>
              <button class="tool-btn danger" @click="askDelete('diary', g.date)">删除</button>
            </div>
          </div>
          <p class="rec-text">{{ g.diary.content }}</p>
        </div>

        <!-- 复盘笔记卡 -->
        <div v-if="g.review" class="rec-card review-card">
          <div class="rec-head">
            <span class="rec-kind">{{ REVIEW_KINDS[g.review.kind]?.name }} 复盘</span>
            <div class="rec-tools">
              <button class="tool-btn" @click="openReview(g.date)">编辑</button>
              <button class="tool-btn danger" @click="askDelete('review', g.date)">删除</button>
            </div>
          </div>
          <div class="rv-preview">
            <div
              v-for="b in REVIEW_KINDS[g.review.kind]?.blocks || []"
              :key="b.key"
              class="rv-pv-block"
              :class="{ wide: b.wide }"
            >
              <span class="rv-pv-title">{{ b.title.split(' · ')[1] }}</span>
              <p class="rv-pv-text">{{ g.review.data[b.key] || '（未填写）' }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 空状态 -->
      <div v-if="!groups.length" class="day-empty">
        <span class="empty-emoji">{{ view === 'today' ? '✎' : '🗂' }}</span>
        <p>{{ view === 'today' ? '今天还没有记录，写点什么吧。' : '还没有历史日记，去写下第一篇吧。' }}</p>
      </div>
    </div>

    <!-- ③ 写日记弹层（只能写今天） -->
    <div v-if="diaryDlg.open" class="modal-mask">
      <div class="composer diary-composer" @click.stop>
        <h3 class="cmp-title-bar">{{ fullDateLabel(diaryDlg.date) }}的心情</h3>
        <div class="mood-row">
          <button
            v-for="m in MOODS"
            :key="m.key"
            class="mood-pick"
            :class="{ active: diaryDlg.mood === m.key }"
            :style="diaryDlg.mood === m.key ? { background: m.color, borderColor: m.color } : {}"
            @click="pickMood(m.key)"
          >
            <span class="mp-emoji">{{ m.emoji }}</span>
            <span class="mp-label">{{ m.label }}</span>
          </button>
        </div>
        <textarea
          ref="diaryAreaRef"
          v-model="diaryDlg.content"
          class="diary-area"
          :placeholder="diaryDlg.mood ? diaryPlaceholder : '先选一个心情，再开始写～'"
          :disabled="!diaryDlg.mood"
        ></textarea>
        <p v-if="diaryError" class="cmp-error">{{ diaryError }}</p>
        <div class="cmp-foot">
          <button class="outline-btn" @click="closeDiary">取消</button>
          <button class="dark-btn red" @click="saveDiaryEntry">保存</button>
        </div>
      </div>
    </div>

    <!-- ④ 复盘笔记弹层（只能写今天） -->
    <div v-if="reviewDlg.open" class="modal-mask">
      <div class="composer review-composer" @click.stop>
        <h3 class="cmp-title-bar">{{ fullDateLabel(reviewDlg.date) }}的复盘笔记</h3>
        <div class="kind-seg">
          <button
            v-for="(kDef, kKey) in REVIEW_KINDS"
            :key="kKey"
            class="seg-btn"
            :class="{ on: reviewDlg.kind === kKey }"
            @click="reviewDlg.kind = kKey"
          >{{ kDef.name }} 复盘</button>
        </div>
        <div class="coord">
          <div
            v-for="b in REVIEW_KINDS[reviewDlg.kind].blocks"
            :key="b.key"
            class="coord-cell"
            :class="{ wide: b.wide }"
          >
            <div class="coord-label">
              <span class="coord-title">{{ b.title }}</span>
              <span class="coord-desc">{{ b.desc }}</span>
            </div>
            <textarea
              v-model="reviewDlg.data[b.key]"
              class="coord-area"
              placeholder="写在这里…"
            ></textarea>
          </div>
        </div>
        <div class="cmp-foot">
          <button class="outline-btn" @click="closeReview">取消</button>
          <button class="dark-btn red" @click="saveReviewEntry">保存</button>
        </div>
      </div>
    </div>

    <!-- ⑤ 删除确认 -->
    <div v-if="confirm.open" class="modal-mask">
      <div class="mini-dialog" @click.stop>
        <h3 class="dlg-title">{{ confirm.title }}</h3>
        <p class="dlg-text">{{ confirm.text }}</p>
        <div class="dlg-foot">
          <button class="outline-btn" @click="confirm.open = false">取消</button>
          <button class="danger-btn" @click="runConfirm">确认删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, nextTick } from 'vue'
import { parseDate as parseD, mkDate } from '@/utils/plansStore'
import {
  MOODS, REVIEW_KINDS, moodOf,
  diaryState, getDiary, saveDiary, deleteDiary,
  getReview, saveReview, deleteReview,
} from '@/utils/diaryStore'

/* ================= 视图与日期 ================= */
const todayStr = mkDate(0)
const view = ref('today') // today | history
const toggleView = () => { view.value = view.value === 'today' ? 'history' : 'today' }

const moodInfo = (key) => moodOf(key)

const fullDateLabel = (s) => {
  const d = parseD(s)
  const week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][d.getDay()]
  const y = d.getFullYear()
  const yPrefix = y === new Date().getFullYear() ? '' : `${y}年`
  return `${yPrefix}${d.getMonth() + 1}月${d.getDate()}日 · ${week}`
}

/* ---------- 分组：今天视图只看今天；历史视图按日期倒序 ---------- */
const groups = computed(() => {
  if (view.value === 'today') {
    const diary = getDiary(todayStr)
    const review = getReview(todayStr)
    return diary || review ? [{ date: todayStr, diary, review }] : []
  }
  const dates = new Set([
    ...Object.keys(diaryState.value.diaries),
    ...Object.keys(diaryState.value.reviews),
  ])
  return [...dates]
    .filter((d) => d <= todayStr)
    .sort()
    .reverse()
    .map((date) => ({ date, diary: getDiary(date), review: getReview(date) }))
})

/* ================= 写日记弹层 ================= */
const diaryAreaRef = ref(null)
const diaryError = ref('')
const diaryPlaceholder = computed(() => {
  const m = moodOf(diaryDlg.mood)
  if (!m) return '先选一个心情，再开始写～'
  const map = {
    great: '今天看起来很棒呀，发生了什么好事？',
    good: '还不错的一天，值得记下的瞬间是？',
    meh: '平平淡淡的一天，心里在想些什么？',
    tired: '辛苦了，是什么让你感到疲惫？',
    sad: '难过的时候不用硬撑，把它写下来会轻一点。',
  }
  return map[m.key] || '此刻在想些什么？'
})
const diaryDlg = reactive({ open: false, date: todayStr, mood: '', content: '' })

// 新建只能写今天；历史页编辑传入具体日期
const openDiary = (date = todayStr) => {
  const exist = getDiary(date)
  diaryDlg.open = true
  diaryDlg.date = date
  diaryDlg.mood = exist?.mood || ''
  diaryDlg.content = exist?.content || ''
  diaryError.value = ''
  if (exist?.mood) nextTick(() => diaryAreaRef.value?.focus())
}
const pickMood = (key) => {
  diaryDlg.mood = key
  diaryError.value = ''
  nextTick(() => diaryAreaRef.value?.focus())
}
const closeDiary = () => { diaryDlg.open = false }
const saveDiaryEntry = () => {
  if (!diaryDlg.mood) { diaryError.value = '先选一个心情吧'; return }
  if (!diaryDlg.content.trim()) { diaryError.value = '写点什么再保存吧'; nextTick(() => diaryAreaRef.value?.focus()); return }
  saveDiary(diaryDlg.date, { mood: diaryDlg.mood, content: diaryDlg.content.trim() })
  diaryDlg.open = false
}

/* ================= 复盘笔记弹层 ================= */
const emptyReviewData = () => ({
  keep: '', problem: '', try: '',
  record: '', reflect: '', refine: '',
})
const reviewDlg = reactive({ open: false, date: todayStr, kind: 'kpt', data: emptyReviewData() })

const openReview = (date = todayStr) => {
  const exist = getReview(date)
  reviewDlg.open = true
  reviewDlg.date = date
  reviewDlg.kind = exist?.kind || 'kpt'
  reviewDlg.data = { ...emptyReviewData(), ...(exist?.data || {}) }
}
const closeReview = () => { reviewDlg.open = false }
const saveReviewEntry = () => {
  const blocks = REVIEW_KINDS[reviewDlg.kind].blocks
  const filled = blocks.some((b) => reviewDlg.data[b.key]?.trim())
  if (!filled) return
  saveReview(reviewDlg.date, {
    kind: reviewDlg.kind,
    data: Object.fromEntries(blocks.map((b) => [b.key, reviewDlg.data[b.key].trim()])),
  })
  reviewDlg.open = false
}

/* ================= 删除确认 ================= */
const confirm = reactive({ open: false, title: '', text: '', type: '', date: '' })
const askDelete = (type, date) => {
  confirm.type = type
  confirm.date = date
  if (type === 'diary') {
    confirm.title = '删除这篇心情日记？'
    confirm.text = `${fullDateLabel(date)} 的心情记录将被永久删除，此操作无法撤销。`
  } else {
    confirm.title = '删除这篇复盘笔记？'
    confirm.text = `${fullDateLabel(date)} 的复盘内容将被永久删除，此操作无法撤销。`
  }
  confirm.open = true
}
const runConfirm = () => {
  if (confirm.type === 'diary') deleteDiary(confirm.date)
  else deleteReview(confirm.date)
  confirm.open = false
}
</script>

<style scoped>
.diary {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 14px;
  padding: 20px;
  background: #fff;
}

/* ---------- ① 红色问候卡 ---------- */
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
.hero-red { background: #EA4335; }
.hero-left { z-index: 1; }
.hero-title { margin: 0; font-size: clamp(18px, 1.8vw, 26px); font-weight: 800; color: #fff; }
.hero-actions { display: flex; gap: 10px; z-index: 1; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
.hero-btn {
  display: inline-flex; align-items: center; gap: 5px;
  border: 2px solid #1f1f1f; border-radius: 999px;
  padding: 9px 20px; font-size: 13.5px; font-weight: 800;
  font-family: inherit; cursor: pointer;
  box-shadow: 3px 3px 0 #1f1f1f;
  transition: transform .15s cubic-bezier(.34,1.56,.64,1), box-shadow .15s;
}
.hero-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 #1f1f1f; }
.hero-btn.solid { background: #fff; color: #1f1f1f; }
.hero-btn.solid:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #1f1f1f; }
.hero-btn.ghost { background: transparent; color: #fff; border-color: #fff; box-shadow: 3px 3px 0 rgba(31,31,31,.55); }
.hero-btn.ghost:hover { transform: translate(-1px,-1px); }
.hb-plus { font-size: 15px; font-weight: 700; }
.hero-shape { position: absolute; pointer-events: none; opacity: .22; }
.s-circle { width: 110px; height: 110px; border-radius: 50%; background: #fff; top: -34px; right: 22%; }
.s-tri {
  width: 0; height: 0;
  border-left: 42px solid transparent; border-right: 42px solid transparent; border-bottom: 70px solid #fff;
  bottom: -30px; right: 4%;
}

/* ---------- ② 记录区 ---------- */
.records {
  flex: 1; min-height: 0; overflow-y: auto;
  display: flex; flex-direction: column; gap: 16px;
}
.date-group { display: flex; flex-direction: column; gap: 10px; }
.group-date {
  margin: 0; display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 800; color: #1f1f1f;
  position: sticky; top: -1px; z-index: 2;
  background: rgba(255,255,255,.92); backdrop-filter: blur(4px);
  padding: 6px 2px;
}
.gd-text { white-space: nowrap; }
.gd-tag {
  font-size: 11px; font-weight: 800; color: #fff; background: #EA4335;
  border: 1.5px solid #1f1f1f; border-radius: 6px; padding: 1px 8px;
}

.rec-card {
  border: 2px solid #1f1f1f; border-radius: 12px; background: #fff;
  box-shadow: 3px 3px 0 #1f1f1f; padding: 14px 16px;
}
.rec-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.rec-mood { display: flex; align-items: center; gap: 8px; }
.rec-emoji {
  width: 34px; height: 34px; border-radius: 50%;
  border: 2px solid #1f1f1f; background: #fff;
  display: inline-flex; align-items: center; justify-content: center; font-size: 18px;
}
.rec-label { font-size: 14px; font-weight: 800; }
.rec-kind {
  font-size: 12.5px; font-weight: 800; color: #fff; background: #EA4335;
  border: 1.5px solid #1f1f1f; border-radius: 6px; padding: 2px 10px;
}
.rec-tools { display: flex; gap: 6px; }
.tool-btn {
  border: 1.5px solid rgba(31,31,31,.25); border-radius: 8px; background: #fff;
  font-size: 12px; font-weight: 700; font-family: inherit; padding: 4px 10px; cursor: pointer;
}
.tool-btn:hover { border-color: #1f1f1f; background: #F6F5F0; }
.tool-btn.danger { color: #EA4335; }
.tool-btn.danger:hover { background: #FCE8E6; border-color: #EA4335; }
.rec-text { margin: 0; font-size: 14px; line-height: 1.8; color: #1f1f1f; white-space: pre-wrap; word-break: break-word; }

.rv-preview { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.rv-pv-block {
  border: 1.5px dashed rgba(31,31,31,.25); border-radius: 10px;
  padding: 8px 10px; display: flex; flex-direction: column; gap: 4px;
}
.rv-pv-block.wide { grid-column: 1 / -1; }
.rv-pv-title { font-size: 12px; font-weight: 800; color: #EA4335; }
.rv-pv-text { margin: 0; font-size: 12.5px; line-height: 1.7; color: rgba(31,31,31,.78); white-space: pre-wrap; word-break: break-word; }

.day-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; color: rgba(31,31,31,.38);
}
.empty-emoji {
  width: 54px; height: 54px; border-radius: 50%;
  border: 2px dashed rgba(31,31,31,.3);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 24px;
}
.day-empty p { margin: 0; font-size: 13px; }

/* ---------- 弹层通用 ---------- */
.modal-mask {
  position: fixed; inset: 0; background: rgba(31,31,31,.32);
  display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px;
}
.composer {
  background: #fff; border: 2px solid #1f1f1f; border-radius: 18px;
  box-shadow: 6px 6px 0 #1f1f1f; padding: 20px 22px;
  max-height: 88vh; overflow-y: auto;
}
.diary-composer { width: min(520px, 100%); }
.review-composer { width: min(780px, 100%); }
.cmp-title-bar { margin: 0 0 14px; font-size: 17px; font-weight: 800; }
.cmp-foot { display: flex; justify-content: flex-end; gap: 12px; margin-top: 14px; }
.outline-btn, .dark-btn, .danger-btn {
  border-radius: 22px; padding: 9px 30px; font-size: 14px; font-weight: 700;
  cursor: pointer; font-family: inherit;
}
.outline-btn { border: 2px solid #1f1f1f; background: #fff; color: #1f1f1f; }
.outline-btn:hover { background: #F6F5F0; }
.dark-btn { border: 2px solid #1f1f1f; background: #1f1f1f; color: #fff; }
.dark-btn.red { background: #EA4335; }
.dark-btn.red:hover { background: #d9382b; }
.danger-btn {
  border: 2px solid #1f1f1f; background: #EA4335; color: #fff;
  box-shadow: 3px 3px 0 #1f1f1f;
}
.danger-btn:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #1f1f1f; }
.danger-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 #1f1f1f; }
.cmp-error { margin: 8px 0 0; font-size: 12.5px; color: #EA4335; font-weight: 700; }

/* 心情选择 */
.mood-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 14px; }
.mood-pick {
  border: 2px solid rgba(31,31,31,.2); border-radius: 14px; background: #fff;
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  padding: 10px 4px; cursor: pointer; font-family: inherit;
  transition: transform .15s cubic-bezier(.34,1.56,.64,1), border-color .15s;
}
.mood-pick:hover { transform: translateY(-2px); border-color: #1f1f1f; }
.mood-pick.active { border-color: #1f1f1f; box-shadow: 2px 2px 0 #1f1f1f; }
.mood-pick.active .mp-label { color: #fff; }
.mp-emoji { font-size: 24px; }
.mp-label { font-size: 12px; font-weight: 700; color: rgba(31,31,31,.7); }

.diary-area {
  width: 100%; min-height: 200px; resize: vertical; box-sizing: border-box;
  border: 2px solid #1f1f1f; border-radius: 12px;
  padding: 12px 14px; font-size: 14px; line-height: 1.8; font-family: inherit;
  color: #1f1f1f; outline: none; background: #fff;
}
.diary-area:focus { border-color: #EA4335; }
.diary-area:disabled { background: #F6F5F0; cursor: not-allowed; }
.hero-sub { margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,.85); font-weight: 500; }
/* 复盘模版切换 */
.kind-seg {
  display: inline-flex; border: 2px solid #1f1f1f; border-radius: 10px;
  overflow: hidden; margin-bottom: 14px;
}
.seg-btn {
  border: none; background: #fff; padding: 8px 22px; font-size: 13px; font-weight: 800;
  cursor: pointer; font-family: inherit; color: rgba(31,31,31,.6);
}
.seg-btn.on { background: #EA4335; color: #fff; }

/* 坐标系分块 */
.coord { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.coord-cell {
  border: 2px solid #1f1f1f; border-radius: 12px; background: #fff;
  box-shadow: 3px 3px 0 #1f1f1f; padding: 12px 14px;
  display: flex; flex-direction: column; gap: 8px;
}
.coord-cell.wide { grid-column: 1 / -1; }
.coord-label { display: flex; flex-direction: column; gap: 2px; }
.coord-title { font-size: 13.5px; font-weight: 800; color: #EA4335; }
.coord-desc { font-size: 11.5px; color: rgba(31,31,31,.5); }
.coord-area {
  width: 100%; min-height: 96px; resize: vertical; box-sizing: border-box;
  border: 1.5px dashed rgba(31,31,31,.25); border-radius: 10px;
  padding: 9px 11px; font-size: 13px; line-height: 1.7; font-family: inherit;
  color: #1f1f1f; outline: none; background: #FCFCFA;
}
.coord-cell.wide .coord-area { min-height: 76px; }
.coord-area:focus { border-color: #EA4335; background: #fff; }

/* 删除确认 */
.mini-dialog {
  width: min(420px, 100%);
  background: #fff; border: 2px solid #1f1f1f; border-radius: 16px;
  box-shadow: 6px 6px 0 #1f1f1f; padding: 22px 24px;
}
.dlg-title { margin: 0 0 8px; font-size: 17px; font-weight: 800; }
.dlg-text { margin: 0 0 16px; font-size: 13px; line-height: 1.7; color: rgba(31,31,31,.65); }
.dlg-foot { display: flex; justify-content: flex-end; gap: 12px; }

/* ---------- 响应式 ---------- */
@media (max-width: 760px) {
  .hero { flex-direction: column; align-items: flex-start; }
  .mood-row { grid-template-columns: repeat(5, 1fr); gap: 5px; }
  .mood-pick { padding: 8px 2px; }
  .mp-emoji { font-size: 20px; }
  .coord { grid-template-columns: 1fr; }
  .coord-cell.wide { grid-column: auto; }
  .rv-preview { grid-template-columns: 1fr; }
  .rv-pv-block.wide { grid-column: auto; }
}

/* ---------- 夜间模式（只覆盖表面色，高饱和问候卡不动） ---------- */
html.dark .diary { background: var(--paper); }
html.dark .modal-mask { background: rgba(0, 0, 0, 0.55); }
html.dark .rec-card,
html.dark .composer,
html.dark .mini-dialog,
html.dark .diary-area,
html.dark .coord-cell,
html.dark .mood-pick,
html.dark .tool-btn,
html.dark .outline-btn { background: var(--card); color: var(--ink); }
html.dark .rec-text,
html.dark .cmp-title-bar,
html.dark .dlg-title,
html.dark .coord-title { color: var(--ink); }
html.dark .coord-desc,
html.dark .rv-pv-text { color: var(--ink-55); }
html.dark .diary-area { color: var(--ink); }
html.dark .diary-area:disabled { background: var(--hover-bg); }
html.dark .coord-area { background: var(--paper); color: var(--ink); }
html.dark .coord-area:focus { background: var(--card); }
html.dark .tool-btn { border-color: var(--ink-25); }
html.dark .tool-btn:hover { background: var(--hover-bg); }
html.dark .group-date { background: rgba(22, 22, 28, 0.92); color: var(--ink); }
html.dark .rv-pv-block { border-color: var(--ink-25); }
html.dark .seg-btn { background: var(--card); color: var(--ink-55); }
html.dark .seg-btn.on { background: #EA4335; color: #fff; }
html.dark .mp-label { color: var(--ink-55); }
html.dark .day-empty { color: var(--ink-40); }
html.dark .mood-pick.active .mp-label { color: #fff; }
</style>
