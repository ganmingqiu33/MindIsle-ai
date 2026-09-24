import { ref } from 'vue'
import { scopedKey } from '@/utils/storageScope'
import { pullFromServer, pushToServer } from '@/utils/serverSync'

/* ============================================================
 * 心情日记 / 复盘笔记 · 模块级单例
 * 持久化到 localStorage（按账号隔离）+ 服务端 user_data 表
 * ============================================================ */

const STORAGE_BASE = 'xinyu-diary'
const SERVER_TYPE = 'diary'

/* 心情选项（与仪表盘一致） */
export const MOODS = [
  { key: 'great', emoji: '😊', label: '很好', color: '#34A853' },
  { key: 'good', emoji: '🙂', label: '不错', color: '#1A73E8' },
  { key: 'meh', emoji: '😐', label: '平静', color: '#FBBC04' },
  { key: 'tired', emoji: '😪', label: '有点累', color: '#A142F4' },
  { key: 'sad', emoji: '😢', label: '有点难过', color: '#EA4335' },
]
export const moodOf = (key) => MOODS.find((m) => m.key === key) || null

/* 复盘模版：KPT 与 3R，每个模版 3 个分块（前两块并排，第三块通栏，构成坐标系） */
export const REVIEW_KINDS = {
  kpt: {
    name: 'KPT',
    blocks: [
      { key: 'keep', title: 'Keep · 保持', desc: '今天哪些做法有效，值得继续保持？' },
      { key: 'problem', title: 'Problem · 问题', desc: '遇到了哪些阻碍、失误或不足？' },
      { key: 'try', title: 'Try · 尝试', desc: '下一步具体打算尝试什么？', wide: true },
    ],
  },
  r3: {
    name: '3R',
    blocks: [
      { key: 'record', title: 'Record · 记录', desc: '客观记录今天发生的关键事件。' },
      { key: 'reflect', title: 'Reflect · 反思', desc: '情绪与行为背后的原因是什么？' },
      { key: 'refine', title: 'Refine · 提炼', desc: '沉淀出可复用的经验与下一步行动。', wide: true },
    ],
  },
}

const emptyState = () => ({ diaries: {}, reviews: {} })

const load = () => {
  try {
    const raw = localStorage.getItem(scopedKey(STORAGE_BASE))
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj && typeof obj === 'object') {
        return { diaries: obj.diaries || {}, reviews: obj.reviews || {} }
      }
    }
  } catch {}
  return emptyState()
}

export const diaryState = ref(load())
const persist = () => {
  try { localStorage.setItem(scopedKey(STORAGE_BASE), JSON.stringify(diaryState.value)) } catch {}
  pushToServer(SERVER_TYPE, diaryState.value)
}

// 启动时从服务端拉取
pullFromServer(SERVER_TYPE).then((serverData) => {
  if (serverData && typeof serverData === 'object') {
    diaryState.value = { diaries: serverData.diaries || {}, reviews: serverData.reviews || {} }
  }
})

/* ---------- 心情日记 ---------- */
export const getDiary = (date) => diaryState.value.diaries[date] || null

export const saveDiary = (date, payload) => {
  diaryState.value.diaries[date] = {
    mood: payload.mood,
    content: payload.content || '',
    updatedAt: Date.now(),
  }
  persist()
}

export const deleteDiary = (date) => {
  delete diaryState.value.diaries[date]
  persist()
}

/* ---------- 复盘笔记 ---------- */
export const getReview = (date) => diaryState.value.reviews[date] || null

export const saveReview = (date, payload) => {
  diaryState.value.reviews[date] = {
    kind: payload.kind,
    data: payload.data || {},
    updatedAt: Date.now(),
  }
  persist()
}

export const deleteReview = (date) => {
  delete diaryState.value.reviews[date]
  persist()
}

export function useDiary() {
  return {
    diaryState,
    getDiary,
    saveDiary,
    deleteDiary,
    getReview,
    saveReview,
    deleteReview,
  }
}
