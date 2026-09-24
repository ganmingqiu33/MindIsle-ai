<template>
  <div class="ai-page">
    <!-- ========== 聊天区（主区，居左） ========== -->
    <div class="chat">
      <!-- 无消息时：居中问候 -->
      <div v-if="messages.length === 0" class="welcome">
        <div class="welcome-emoji">☁️</div>
        <h1 class="welcome-title">Hi，有什么可以帮你的吗</h1>
        <p class="welcome-sub">和心屿聊聊，它会慢慢懂你。</p>
      </div>

      <!-- 消息区（无头像，只留气泡） -->
      <div v-else ref="msgBoxRef" class="msg-list">
        <div v-for="(m, i) in messages" :key="i" class="msg-row" :class="m.role">
          <div class="msg-col">
            <div v-if="displayText(m)" class="bubble" :class="{ error: m.error }">
              <!-- 生成中且还没有字：三个跳动圆点 -->
              <span v-if="m.generating && !displayText(m)" class="thinking">
                <i></i><i></i><i></i>
              </span>
              <template v-else>{{ displayText(m) }}</template>
              <!-- 流式打字光标 -->
              <span v-if="m.generating && displayText(m)" class="cursor"></span>
            </div>
            <!-- 用户消息附带的文件标签 -->
            <div v-if="m.files && m.files.length" class="msg-files">
              <span v-for="(af, ai) in m.files" :key="ai" class="msg-file-chip">
                <el-icon :size="12"><Document /></el-icon>{{ af.name }}
              </span>
            </div>
            <!-- 生成中但正文为空（可能正在输出动作块）：跳动圆点 -->
            <div v-if="m.generating && !displayText(m)" class="bubble">
              <span class="thinking"><i></i><i></i><i></i></span>
            </div>

            <!-- AI 建计划确认卡片 -->
            <div v-if="m.actionPlans && m.actionPlans.length" class="action-card">
              <div class="ac-head">
                <span class="ac-ico">
                  <el-icon :size="15"><Calendar /></el-icon>
                </span>
                <strong>心屿为你生成了 {{ m.actionPlans.length }} 条计划</strong>
              </div>
              <div class="ac-groups">
                <div v-for="g in groupActionPlans(m.actionPlans)" :key="g.date" class="ac-group">
                  <p class="ac-date">{{ g.label }}</p>
                  <div v-for="(p, pi) in g.items" :key="pi" class="ac-plan">
                    <div class="acp-row">
                      <span class="ac-dot" :style="{ background: qColor(p.quadrant) }"></span>
                      <span v-if="p.startTime" class="ac-time">{{ p.startTime }}<template v-if="p.endTime">–{{ p.endTime }}</template></span>
                      <span class="ac-title">{{ p.title }}</span>
                      <span v-if="p.repeat.type !== 'none'" class="ac-repeat">{{ repeatLabel(p.repeat) }}</span>
                    </div>
                    <p v-if="p.desc" class="ac-desc">{{ p.desc }}</p>
                  </div>
                </div>
              </div>

              <!-- 待确认 -->
              <div v-if="m.actionStatus === 'pending'" class="ac-actions">
                <button class="ac-btn primary" @click="confirmAction(m)">全部创建</button>
                <button class="ac-btn ghost" @click="dismissAction(m)">取消</button>
              </div>
              <!-- 已创建 -->
              <div v-else-if="m.actionStatus === 'created'" class="ac-done">
                <span class="ac-done-text">
                  ✓ 已加入时间计划<template v-if="m.actionSkipped">（{{ m.actionSkipped }} 条已存在已跳过）</template>
                </span>
                <button class="ac-link" @click="goPlans(m)">去看看 ›</button>
              </div>
              <!-- 已取消 -->
              <p v-else class="ac-dismissed">已取消，没有创建任何计划</p>
            </div>

            <!-- RAG 引用来源 -->
            <div v-if="m.sources && m.sources.length" class="sources">
              <el-tooltip
                v-for="(src, si) in m.sources"
                :key="si"
                :content="src.content"
                placement="top"
                :show-after="300"
              >
                <span class="src-chip">
                  <el-icon :size="12"><Document /></el-icon>{{ src.name }}
                </span>
              </el-tooltip>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部输入区 -->
      <div class="input-bar">
        <!-- 今日次数用完时提示（剩余次数在「我的主页」查看） -->
        <div v-if="aiExhausted" class="quota-row">
          <div class="quota-badge quota-out">
            <el-icon :size="14"><WarningFilled /></el-icon>
            今日 {{ aiLimit }} 次已用完 · 明天 0 点重置
          </div>
        </div>
        <div class="input-card">
          <textarea
            v-model="draft"
            class="input-area"
            rows="1"
            :placeholder="aiExhausted ? '今日对话次数已用完' : (generating ? '心屿正在回复你……' : '给心屿发送消息')"
            :disabled="generating || aiExhausted"
            @keydown="onKeydown"
            @input="autoResize"
          />
          <button v-if="generating" class="send-btn stop" title="停止生成" @click="stopGenerating">
            <el-icon :size="17"><VideoPause /></el-icon>
          </button>
          <button v-else class="send-btn" :disabled="!canSend" @click="send">
            <el-icon :size="17"><Promotion /></el-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- ========== 右侧栏：历史会话 + 知识库（高饱和风格） ========== -->
    <aside v-show="railOpen" class="rail">
      <!-- Tab 切换 -->
      <div class="rail-tabs">
        <button
          class="rail-tab"
          :class="{ active: railTab === 'sessions' }"
          @click="railTab = 'sessions'"
        >历史会话</button>
        <button
          class="rail-tab"
          :class="{ active: railTab === 'knowledge' }"
          @click="railTab = 'knowledge'"
        >知识库</button>
        <button class="rail-tab-close" @click="railOpen = false" title="收起">
          <el-icon :size="14"><Fold /></el-icon>
        </button>
      </div>

      <!-- ===== 历史会话面板 ===== -->
      <div v-show="railTab === 'sessions'" class="rail-panel">
        <div class="rail-head">
          <button class="rail-new" @click="createChat" title="新对话">
            <el-icon :size="14"><Plus /></el-icon>
            <span>新对话</span>
          </button>
        </div>
        <div class="rail-scroll">
          <template v-for="g in groupedSessions" :key="g.label">
            <div class="rail-group">{{ g.label }}</div>
            <div
              v-for="s in g.items"
              :key="s.id"
              class="rail-item"
              :class="{ active: s.id === currentId }"
              @click="openChat(s.id)"
            >
              <el-icon :size="13" class="rail-ico"><ChatLineRound /></el-icon>
              <span class="rail-text">{{ s.title }}</span>
              <el-icon class="rail-del" @click.stop="removeSession(s.id)"><Close /></el-icon>
            </div>
          </template>
          <div v-if="!sessions.length" class="rail-empty">还没有对话，点上方「新对话」开始</div>
        </div>
      </div>

      <!-- ===== AI 知识库面板 ===== -->
      <div v-show="railTab === 'knowledge'" class="rail-panel kb-panel">
        <!-- 上传区（点击 + 拖拽） -->
        <div
          class="kb-drop"
          :class="{ over: dragOver }"
          @click="$refs.kbInput.click()"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="onDrop"
        >
          <el-icon :size="22" class="kb-drop-ico"><Upload /></el-icon>
          <p class="kb-drop-title">拖拽文件到这里</p>
          <p class="kb-drop-sub">或点击选择文件</p>
          <p class="kb-drop-hint">支持 doc / docx / txt / md / pdf，≤ 15MB</p>
          <input
            ref="kbInput"
            type="file"
            class="kb-input"
            accept=".doc,.docx,.txt,.md,.pdf"
            multiple
            @change="onPick"
          />
        </div>

        <!-- 文件列表 -->
        <div class="kb-list">
          <div v-if="!kbFiles.length" class="kb-empty">
            <el-icon :size="26" class="kb-empty-ico"><Document /></el-icon>
            <p>还没有文件</p>
            <span>上传后可以让 AI 总结调用</span>
          </div>
          <div v-for="f in kbFiles" :key="f.id" class="kb-item" :class="f.status">
            <!-- 第一行：图标 + 文件名/信息 + 删除 -->
            <div class="kb-row1">
              <span class="kb-ico"><el-icon :size="15"><Document /></el-icon></span>
              <div class="kb-info">
                <p class="kb-name" :title="f.name">{{ f.name }}</p>
                <p class="kb-meta">
                  <span class="kb-ext">{{ f.ext }}</span>
                  <span class="kb-dot">·</span>
                  <span>{{ fmtSize(f.size) }}</span>
                </p>
              </div>
              <button class="kb-del" @click="removeFile(f.id)" title="删除文件">
                <el-icon :size="13"><Close /></el-icon>
              </button>
            </div>
            <!-- 第二行：状态徽章 + 操作 -->
            <div class="kb-row2">
              <span class="kb-badge" :class="kbBadgeClass(f)">
                <i v-if="f.status === 'uploading' || f.status === 'summarizing'" class="kb-spin" />
                {{ kbStatusText(f) }}
              </span>
              <button
                v-if="f.status === 'ready' || f.status === 'done'"
                class="kb-btn"
                :disabled="generating"
                @click="summarize(f)"
              >{{ f.status === 'done' ? '再总结一次' : 'AI 总结' }}</button>
            </div>
            <p v-if="f.status === 'error' && f.error" class="kb-err">{{ f.error }}</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- 折叠态的重新展开按钮（右侧悬浮） -->
    <button v-show="!railOpen" class="rail-reopen" @click="railOpen = true" title="展开历史栏">
      <el-icon :size="16"><Expand /></el-icon>
      <span>历史</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Promotion,
  VideoPause,
  Document,
  Plus,
  Close,
  ChatLineRound,
  Fold,
  Expand,
  Calendar,
  Upload,
  WarningFilled,
} from '@element-plus/icons-vue'
import { useChatSessions } from '@/utils/chatStore'
import { displayFor } from '@/utils/actionProtocol'
import { quadrantColors } from '@/utils/plansStore'
import { useKnowledgeFiles } from '@/utils/knowledgeStore'
import { useFrontAuth } from '@/utils/frontAuth'
import { useAiUsage } from '@/utils/usageStore'

const router = useRouter()
const route = useRoute()

const { isLoggedIn } = useFrontAuth()
const { canUse: aiCanUse, exhausted: aiExhausted, limit: aiLimit, refreshQuota } = useAiUsage()

const {
  sessions,
  currentId,
  groupedSessions,
  currentSession,
  generating,
  newSession,
  selectSession,
  removeSession,
  sendMessage,
  stopGenerating,
  summarizeFile,
  applyAction,
  dismissAction,
} = useChatSessions()

const {
  files: kbFiles,
  uploadKnowledgeFile,
  removeKnowledgeFile,
  validateFile,
} = useKnowledgeFiles()

// 右侧栏开关 + Tab 切换（历史会话 / 知识库）
const railOpen = ref(true)
const railTab = ref('sessions')

// 知识库上传相关
const dragOver = ref(false)
const kbInput = ref(null)

const fmtSize = (n) => {
  if (!n) return '0B'
  if (n < 1024) return n + 'B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + 'KB'
  return (n / 1024 / 1024).toFixed(1) + 'MB'
}

// 文件状态文案与徽章配色
const kbStatusText = (f) => {
  switch (f.status) {
    case 'uploading':
      return '上传中'
    case 'summarizing':
      return 'AI 总结中'
    case 'done':
      return '已总结'
    case 'error':
      return '上传失败'
    default:
      return '就绪'
  }
}
const kbBadgeClass = (f) => ({
  uploading: 'st-blue',
  summarizing: 'st-yellow',
  done: 'st-green',
  error: 'st-red',
  ready: 'st-gray',
}[f.status] || 'st-gray')

// 处理选中的文件（点击选择 / 拖拽共用）
const handleFiles = async (fileList) => {
  const arr = Array.from(fileList || [])
  if (!arr.length) return
  for (const file of arr) {
    const v = validateFile(file)
    if (!v.ok) {
      ElMessage.warning(v.error)
      continue
    }
    try {
      ElMessage.success(`正在上传 ${file.name}`)
      await uploadKnowledgeFile(file)
      ElMessage.success(`${file.name} 上传完成，可点击「总结」让 AI 阅读`)
    } catch (err) {
      ElMessage.error(`${file.name} 上传失败：${err?.message || '未知错误'}`)
    }
  }
}

const onPick = (e) => {
  handleFiles(e.target.files)
  e.target.value = '' // 允许重复选择同一文件
}

const onDrop = (e) => {
  dragOver.value = false
  handleFiles(e.dataTransfer.files)
}

const summarize = async (f) => {
  if (!aiCanUse.value) {
    ElMessage.warning(`今日 ${aiLimit} 次 AI 对话已用完，无法总结文件`)
    return
  }
  try {
    ElMessage.info(`正在让 AI 总结《${f.name}》…`)
    railTab.value = 'sessions'
    await summarizeFile(f)
  } catch (err) {
    if (err?.code === 'AI_USAGE_EXHAUSTED') {
      ElMessage.warning(`今日 ${aiLimit} 次 AI 对话已用完，明天再来吧`)
    } else {
      ElMessage.error(`总结失败：${err?.message || '未知错误'}`)
    }
  }
}

const removeFile = (id) => {
  removeKnowledgeFile(id)
  ElMessage.success('已删除')
}

const createChat = () => {
  newSession()
}
const openChat = (id) => selectSession(id)

const messages = computed(() => currentSession.value?.messages || [])
const draft = ref('')
const msgBoxRef = ref()

/* 未登录游客不能使用 AI：直接跳登录页；登录用户处理「AI 创建目标」预填 */
onMounted(() => {
  if (!isLoggedIn.value) {
    router.replace('/front/login')
    return
  }
  refreshQuota()
  const prefill = route.query.prefill
  if (typeof prefill === 'string' && prefill) {
    draft.value = prefill
    router.replace({ path: route.path })
    nextTick(() => document.querySelector('.input-area')?.focus())
  }
})

/* ---------- AI 动作（建计划）展示辅助 ---------- */
// 流式过程中动作块还没被剥离，展示时实时隐藏，避免 JSON 闪过
const displayText = (m) => (m.actionPlans ? m.content : displayFor(m.content || '', !!m.generating))

const qColor = (key) => quadrantColors[key] || '#1A73E8'

const repeatLabel = (repeat) => {
  switch (repeat.type) {
    case 'daily': return repeat.interval > 1 ? `每 ${repeat.interval} 天` : '每天'
    case 'workday': return '工作日'
    case 'weekly': {
      const map = ['一', '二', '三', '四', '五', '六', '日']
      return '每周' + repeat.weekdays.map((d) => map[d - 1]).join('、')
    }
    case 'monthly': return '每月'
    default: return ''
  }
}

const fmtDateLabel = (dateStr) => {
  const today = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const tStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  const tmr = new Date(today); tmr.setDate(today.getDate() + 1)
  const tmStr = `${tmr.getFullYear()}-${pad(tmr.getMonth() + 1)}-${pad(tmr.getDate())}`
  if (dateStr === tStr) return '今天'
  if (dateStr === tmStr) return '明天'
  const [y, m, d] = dateStr.split('-').map(Number)
  const dow = '周' + ['日', '一', '二', '三', '四', '五', '六'][new Date(y, m - 1, d).getDay()]
  return y === today.getFullYear() ? `${m}月${d}日 ${dow}` : `${y}年${m}月${d}日 ${dow}`
}

// 计划按日期分组（保持原始顺序）
const groupActionPlans = (list) => {
  const map = new Map()
  for (const p of list) {
    if (!map.has(p.date)) map.set(p.date, [])
    map.get(p.date).push(p)
  }
  return [...map.entries()].map(([date, items]) => ({ date, label: fmtDateLabel(date), items }))
}

const confirmAction = (m) => {
  const { created, skipped } = applyAction(m)
  if (created) ElMessage.success(`已创建 ${created} 条计划${skipped ? `，跳过 ${skipped} 条重复` : ''}`)
  else ElMessage.info('这些计划都已经存在，没有重复创建')
}

// 跳到时间计划页并定位到这批计划的第一天（AI 计划常从明天开始，避免用户在今天找不到）
const goPlans = (m) => {
  const firstDate = m.actionPlans?.[0]?.date
  router.push(firstDate ? `/front/plans?date=${firstDate}` : '/front/plans')
}

const canSend = computed(() => !!draft.value.trim() && !generating.value && aiCanUse.value)

const scrollBottom = () => {
  nextTick(() => {
    if (msgBoxRef.value) msgBoxRef.value.scrollTop = msgBoxRef.value.scrollHeight
  })
}

// 切换会话/消息条数变化滚到底
watch(
  () => [currentSession.value?.id, messages.value.length],
  scrollBottom
)

// 流式输出时跟随内容持续滚到底
watch(
  () => messages.value.map((m) => m.content).join('|'),
  scrollBottom
)

const send = async () => {
  const text = draft.value.trim()
  if (!text || generating.value) return
  if (!aiCanUse.value) {
    ElMessage.warning(`今日 ${aiLimit} 次 AI 对话已用完，明天再来吧`)
    return
  }
  draft.value = ''
  nextTick(() => {
    const ta = document.querySelector('.input-area')
    if (ta) ta.style.height = 'auto'
  })
  try {
    await sendMessage(text)
  } catch (err) {
    if (err?.code === 'AI_USAGE_EXHAUSTED') {
      ElMessage.warning(`今日 ${aiLimit} 次 AI 对话已用完，明天再来吧`)
      draft.value = text
    }
  }
}

// Enter 发送，Shift+Enter 换行
const onKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

// 输入框自适应高度
const autoResize = (e) => {
  const el = e.target
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}
</script>

<style scoped>
/* ============================================================
   AI 聊天页 · 高饱和蓝白风
   - 历史栏在右，聊天区在左
   - 用户气泡：蓝底白字 + 2px 墨线 + 硬投影
   - AI 气泡：白底墨字 + 2px 墨线 + 硬投影
   - 输入框：白底墨线 + 硬投影，发送按钮蓝填充
   ============================================================ */
.ai-page {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative;
  background: var(--paper, #f6f5f0);
}

/* ---------- 聊天主区 ---------- */
.chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--paper, #f6f5f0);
}

/* 问候区 */
.welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  gap: 10px;
}
.welcome-emoji {
  font-size: 56px;
  line-height: 1;
  filter: drop-shadow(2px 2px 0 #1f1f1f);
  animation: float 3s var(--ease-smooth, cubic-bezier(0.22, 1, 0.36, 1)) infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
.welcome-title {
  margin: 6px 0 0;
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 800;
  color: var(--ink, #1f1f1f);
  letter-spacing: -0.01em;
  text-align: center;
  line-height: 1.3;
}
.welcome-sub {
  margin: 0;
  font-size: 14px;
  color: rgba(31, 31, 31, 0.6);
}

/* 消息区 */
.msg-list {
  flex: 1;
  overflow-y: auto;
  padding: 32px 0 12px;
}
.msg-row {
  max-width: 760px;
  margin: 0 auto 18px;
  padding: 0 24px;
  display: flex;
}
.msg-row.user {
  justify-content: flex-end;
}
.msg-row.assistant {
  justify-content: flex-start;
}

/* 气泡 + 引用的纵向容器 */
.msg-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 80%;
}
.msg-row.user .msg-col {
  align-items: flex-end;
}
.msg-row.assistant .msg-col {
  max-width: 100%;
}
.bubble {
  max-width: 100%;
  padding: 11px 16px;
  font-size: 15px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  border: var(--line, 2px solid #1f1f1f);
  border-radius: 18px;
}

/* AI：白底墨字气泡 */
.msg-row.assistant .bubble {
  background: #fff;
  color: var(--ink, #1f1f1f);
  border-radius: 18px 18px 18px 4px;
  box-shadow: 3px 3px 0 var(--ink, #1f1f1f);
}

/* 用户：蓝底白字气泡 */
.msg-row.user .bubble {
  background: var(--c-blue, #1a73e8);
  color: #fff;
  border-radius: 18px 18px 4px 18px;
  box-shadow: 3px 3px 0 var(--ink, #1f1f1f);
}

/* RAG 引用来源标签 */
.sources {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 4px 0;
}
.src-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--ink, #1f1f1f);
  background: #fff;
  border: 1.5px solid var(--ink, #1f1f1f);
  border-radius: 999px;
  padding: 2px 10px;
  cursor: default;
  box-shadow: 1.5px 1.5px 0 var(--ink, #1f1f1f);
  transition:
    transform 0.15s var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)),
    background 0.15s ease;
}
.src-chip:hover {
  transform: translate(-1px, -1px);
  background: var(--c-yellow-soft, #fef7e0);
}

/* ---------- AI 建计划确认卡片 ---------- */
.action-card {
  width: 100%;
  margin-top: 10px;
  background: #fff;
  border: 2px solid #1f1f1f;
  border-radius: 16px;
  box-shadow: 4px 4px 0 #1f1f1f;
  padding: 16px 18px;
}
.ac-head {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 12px;
}
.ac-ico {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: #E8F0FE;
  border: 1.5px solid #1f1f1f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #1A73E8;
  flex-shrink: 0;
}
.ac-head strong {
  font-size: 14.5px;
  font-weight: 800;
  color: #1f1f1f;
}
.ac-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 4px;
}
.ac-date {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 800;
  color: #1A73E8;
  letter-spacing: 0.02em;
}
.ac-plan {
  padding: 8px 10px;
  border: 1.5px dashed rgba(31, 31, 31, 0.2);
  border-radius: 10px;
  margin-bottom: 6px;
}
.ac-plan:last-child { margin-bottom: 0; }
.acp-row {
  display: flex;
  align-items: center;
  gap: 9px;
}
.ac-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  border: 1.5px solid #1f1f1f;
  flex-shrink: 0;
}
.ac-time {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 800;
  color: #1A73E8;
  font-variant-numeric: tabular-nums;
}
.ac-title {
  flex: 1;
  font-size: 13.5px;
  font-weight: 600;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ac-desc {
  margin: 6px 0 0 19px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(31, 31, 31, 0.6);
}
.ac-repeat {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: rgba(31, 31, 31, 0.55);
  background: #F6F5F0;
  border: 1.5px solid rgba(31, 31, 31, 0.25);
  border-radius: 999px;
  padding: 1px 9px;
}
.ac-actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}
.ac-btn {
  border: 2px solid #1f1f1f;
  border-radius: 999px;
  padding: 9px 26px;
  font-size: 13.5px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.14s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.14s;
}
.ac-btn.primary {
  background: #1A73E8;
  color: #fff;
  box-shadow: 3px 3px 0 #1f1f1f;
}
.ac-btn.primary:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 #1f1f1f; }
.ac-btn.primary:active { transform: translate(2px, 2px); box-shadow: 0 0 0 #1f1f1f; }
.ac-btn.ghost {
  background: #fff;
  color: #1f1f1f;
  box-shadow: 3px 3px 0 rgba(31, 31, 31, 0.55);
}
.ac-btn.ghost:hover { background: #F6F5F0; }
.ac-done {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
  padding: 10px 14px;
  background: #E6F4EA;
  border: 1.5px solid #34A853;
  border-radius: 10px;
}
.ac-done-text { font-size: 13px; font-weight: 700; color: #1e7e34; }
.ac-link {
  border: none;
  background: none;
  color: #1A73E8;
  font-size: 13px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  flex-shrink: 0;
}
.ac-link:hover { text-decoration: underline; }
.ac-dismissed {
  margin: 12px 0 0;
  font-size: 12.5px;
  color: rgba(31, 31, 31, 0.45);
}

/* 出错提示 */
.bubble.error {
  background: var(--c-red-soft, #fce8e6) !important;
  color: var(--c-red, #ea4335) !important;
  border-color: var(--c-red, #ea4335) !important;
  box-shadow: 3px 3px 0 var(--c-red, #ea4335) !important;
  font-size: 14px;
}

/* 思考中：三个跳动圆点 */
.thinking {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 2px;
}
.thinking i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ink, #1f1f1f);
  animation: bounce-dot 1.2s infinite ease-in-out;
}
.thinking i:nth-child(2) {
  animation-delay: 0.18s;
}
.thinking i:nth-child(3) {
  animation-delay: 0.36s;
}
@keyframes bounce-dot {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.45;
  }
  30% {
    transform: translateY(-5px);
    opacity: 1;
  }
}

/* 流式打字光标 */
.cursor {
  display: inline-block;
  width: 2px;
  height: 17px;
  margin-left: 2px;
  vertical-align: -2px;
  background: currentColor;
  animation: blink 0.9s steps(1) infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}

/* 输入区 */
.input-bar {
  padding: 8px 24px 28px;
}

/* 今日次数用完提示 */
.quota-row {
  max-width: 760px;
  margin: 0 auto 10px;
  display: flex;
  justify-content: center;
}
.quota-badge.quota-out {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 15px;
  border-radius: 999px;
  border: 2px solid #1f1f1f;
  background: #ea4335;
  color: #fff;
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.3px;
  box-shadow: 3px 3px 0 #1f1f1f;
  animation: quota-shake 0.5s var(--ease-spring, ease);
}
@keyframes quota-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}
.input-card {
  max-width: 760px;
  margin: 0 auto;
  background: #fff;
  border: var(--line, 2px solid #1f1f1f);
  border-radius: 26px;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 8px 8px 8px 20px;
  box-shadow: 4px 4px 0 var(--ink, #1f1f1f);
  transition:
    transform 0.15s var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)),
    box-shadow 0.15s var(--ease-smooth, cubic-bezier(0.22, 1, 0.36, 1));
}
.input-card:focus-within {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 var(--ink, #1f1f1f);
}
.input-area {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-size: 15px;
  line-height: 1.6;
  font-family: inherit;
  color: var(--ink, #1f1f1f);
  background: transparent;
  max-height: 160px;
}
.input-area::placeholder {
  color: #a8a8a8;
}
.input-area:disabled {
  cursor: not-allowed;
  color: #8a8a8a;
}
.send-btn {
  width: 38px;
  height: 38px;
  border: var(--line, 2px solid #1f1f1f);
  border-radius: 50%;
  background: var(--c-blue, #1a73e8);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 2px 2px 0 var(--ink, #1f1f1f);
  transition:
    transform 0.15s var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)),
    box-shadow 0.15s var(--ease-smooth, cubic-bezier(0.22, 1, 0.36, 1)),
    background 0.18s ease;
}
.send-btn:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--ink, #1f1f1f);
  background: #1666c4;
}
.send-btn:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 0 0 0 var(--ink, #1f1f1f);
}
.send-btn:disabled {
  background: #e8e8e8;
  color: #b4b4bc;
  cursor: not-allowed;
  box-shadow: 2px 2px 0 #d4d4d4;
}
/* 停止生成按钮：红色填充，与发送按钮同形 */
.send-btn.stop {
  background: var(--c-red, #ea4335);
}
.send-btn.stop:hover {
  background: #d6372a;
}

/* ============================================================
   历史会话小栏（右侧）
   ============================================================ */
.rail {
  width: 252px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: var(--line, 2px solid #1f1f1f);
  background: #fff;
  position: relative;
}
.rail-head {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 14px 10px;
  border-bottom: 1.5px dashed rgba(31, 31, 31, 0.15);
}
.rail-new {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: var(--line, 2px solid #1f1f1f);
  background: var(--c-yellow, #fbbc04);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--ink, #1f1f1f);
  cursor: pointer;
  box-shadow: 2px 2px 0 var(--ink, #1f1f1f);
  transition:
    transform 0.15s var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)),
    box-shadow 0.15s var(--ease-smooth, cubic-bezier(0.22, 1, 0.36, 1));
}
.rail-new:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--ink, #1f1f1f);
}
.rail-new:active {
  transform: translate(2px, 2px);
  box-shadow: 0 0 0 var(--ink, #1f1f1f);
}

/* Tab 切换栏 */
.rail-tabs {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 8px;
  border-bottom: var(--line, 2px solid #1f1f1f);
  background: #fff;
}
.rail-tab {
  flex: 1;
  padding: 12px 6px;
  font-size: 13px;
  font-weight: 700;
  color: rgba(31, 31, 31, 0.55);
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.rail-tab:hover { color: var(--ink, #1f1f1f); }
.rail-tab.active {
  color: var(--c-blue, #1a73e8);
  border-bottom-color: var(--c-blue, #1a73e8);
}
.rail-tab-close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: rgba(31, 31, 31, 0.5);
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}
.rail-tab-close:hover { background: rgba(31, 31, 31, 0.08); color: var(--ink, #1f1f1f); }

/* 面板容器（历史 / 知识库共用） */
.rail-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.rail-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px 10px 8px;
}
.rail-group {
  font-size: 11.5px;
  font-weight: 700;
  color: rgba(31, 31, 31, 0.5);
  padding: 12px 10px 4px;
  letter-spacing: 1px;
}
.rail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 10px;
  border-radius: 10px;
  font-size: 13.5px;
  color: rgba(31, 31, 31, 0.85);
  cursor: pointer;
  border: 1.5px solid transparent;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.15s var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
}
.rail-item:hover {
  background: var(--c-blue-soft, #e8f0fe);
  border-color: rgba(26, 115, 232, 0.3);
}
.rail-item.active {
  background: var(--c-blue-soft, #e8f0fe);
  border-color: var(--c-blue, #1a73e8);
  color: var(--c-blue, #1a73e8);
  font-weight: 700;
}
.rail-ico {
  color: rgba(31, 31, 31, 0.5);
  flex-shrink: 0;
}
.rail-item.active .rail-ico {
  color: var(--c-blue, #1a73e8);
}
.rail-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rail-del {
  display: none;
  color: rgba(31, 31, 31, 0.5);
  padding: 3px;
  border-radius: 6px;
}
.rail-item:hover .rail-del {
  display: inline-flex;
}
.rail-del:hover {
  color: var(--c-red, #ea4335);
  background: var(--c-red-soft, #fce8e6);
}
.rail-empty {
  font-size: 12.5px;
  color: rgba(31, 31, 31, 0.45);
  text-align: center;
  padding: 32px 12px;
  line-height: 1.7;
}

/* 折叠态：右侧悬浮展开按钮 */
.rail-reopen {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: var(--line, 2px solid #1f1f1f);
  background: var(--c-yellow, #fbbc04);
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--ink, #1f1f1f);
  cursor: pointer;
  box-shadow: 2px 2px 0 var(--ink, #1f1f1f);
  transition:
    transform 0.15s var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)),
    box-shadow 0.15s var(--ease-smooth, cubic-bezier(0.22, 1, 0.36, 1));
}
.rail-reopen:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--ink, #1f1f1f);
}
.rail-reopen:active {
  transform: translate(2px, 2px);
  box-shadow: 0 0 0 var(--ink, #1f1f1f);
}

/* ============================================================
   AI 知识库面板
   ============================================================ */
.kb-panel {
  padding: 14px 12px;
  gap: 14px;
  overflow-y: auto;
}

/* 拖拽上传区 */
.kb-drop {
  border: 2.5px dashed rgba(31, 31, 31, 0.35);
  border-radius: 14px;
  background: rgba(26, 115, 232, 0.06);
  padding: 22px 12px 16px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.15s var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
  position: relative;
}
.kb-drop:hover {
  border-color: var(--c-blue, #1a73e8);
  background: rgba(26, 115, 232, 0.1);
  transform: translateY(-2px);
}
.kb-drop.over {
  border-color: var(--c-blue, #1a73e8);
  background: rgba(26, 115, 232, 0.16);
  transform: scale(1.02);
}
.kb-drop-ico {
  color: var(--c-blue, #1a73e8);
  margin-bottom: 6px;
}
.kb-drop-title {
  margin: 0 0 2px;
  font-size: 13.5px;
  font-weight: 800;
  color: var(--ink, #1f1f1f);
}
.kb-drop-sub {
  margin: 0 0 6px;
  font-size: 12px;
  color: rgba(31, 31, 31, 0.55);
}
.kb-drop-hint {
  margin: 0;
  font-size: 10.5px;
  color: rgba(31, 31, 31, 0.4);
  letter-spacing: 0.5px;
}
.kb-input { display: none; }

/* 文件列表 */
.kb-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.kb-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  color: rgba(31, 31, 31, 0.55);
  text-align: center;
  padding: 26px 8px 22px;
  line-height: 1.6;
}
.kb-empty p {
  margin: 4px 0 0;
  font-weight: 800;
  font-size: 13px;
  color: rgba(31, 31, 31, 0.7);
}
.kb-empty span {
  font-size: 11px;
  color: rgba(31, 31, 31, 0.42);
}
.kb-empty-ico {
  color: rgba(31, 31, 31, 0.28);
}

/* 文件卡片：两行结构，窄栏不重叠 */
.kb-item {
  padding: 11px 11px 10px;
  border: 2px solid rgba(31, 31, 31, 0.16);
  border-radius: 14px;
  background: #fff;
  transition: border-color 0.15s, transform 0.15s var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)), box-shadow 0.15s;
}
.kb-item:hover {
  border-color: #1f1f1f;
  box-shadow: 3px 3px 0 rgba(31, 31, 31, 0.9);
  transform: translate(-1px, -1px);
}
.kb-item.uploading { border-color: #1a73e8; background: rgba(26, 115, 232, 0.04); }
.kb-item.error { border-color: #ea4335; background: rgba(234, 67, 53, 0.04); }
.kb-item.summarizing { border-color: #fbbc04; background: rgba(251, 188, 4, 0.07); }
.kb-item.done { border-color: rgba(52, 168, 83, 0.55); }

.kb-row1 {
  display: flex;
  align-items: center;
  gap: 9px;
}
.kb-ico {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.8px solid #1f1f1f;
  border-radius: 9px;
  background: #e8f0fe;
  color: #1a73e8;
}
.kb-info {
  flex: 1;
  min-width: 0;
}
.kb-name {
  margin: 0;
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1.35;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kb-meta {
  margin: 2px 0 0;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  color: rgba(31, 31, 31, 0.5);
}
.kb-ext {
  text-transform: uppercase;
  font-weight: 800;
  color: #1a73e8;
  letter-spacing: 0.3px;
}
.kb-dot {
  color: rgba(31, 31, 31, 0.3);
}
.kb-del {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid rgba(31, 31, 31, 0.2);
  border-radius: 8px;
  background: #fff;
  color: rgba(31, 31, 31, 0.45);
  cursor: pointer;
  transition: all 0.15s;
}
.kb-del:hover {
  color: #ea4335;
  border-color: #ea4335;
  background: #fce8e6;
}

/* 第二行：状态徽章 + 总结按钮 */
.kb-row2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 9px;
}
.kb-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 800;
  line-height: 1;
  padding: 4px 9px;
  border-radius: 999px;
  border: 1.5px solid #1f1f1f;
  white-space: nowrap;
}
.kb-badge.st-gray { background: #f1f1ef; color: rgba(31, 31, 31, 0.6); }
.kb-badge.st-blue { background: #e8f0fe; color: #1a73e8; }
.kb-badge.st-green { background: #e6f4ea; color: #34a853; }
.kb-badge.st-yellow { background: #fef7e0; color: #b8860b; }
.kb-badge.st-red { background: #fce8e6; color: #ea4335; }
.kb-spin {
  width: 8px;
  height: 8px;
  border: 1.6px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: kb-rotate 0.7s linear infinite;
}
@keyframes kb-rotate {
  to { transform: rotate(360deg); }
}
.kb-btn {
  margin-left: auto;
  font-size: 11px;
  font-weight: 800;
  border: 1.8px solid #1f1f1f;
  border-radius: 999px;
  padding: 4px 12px;
  background: #1a73e8;
  color: #fff;
  cursor: pointer;
  box-shadow: 2px 2px 0 #1f1f1f;
  white-space: nowrap;
  transition:
    transform 0.15s var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)),
    box-shadow 0.15s var(--ease-smooth, ease);
}
.kb-btn:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #1f1f1f;
}
.kb-btn:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 0 0 0 #1f1f1f;
}
.kb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.kb-err {
  margin: 7px 0 0;
  font-size: 10.5px;
  font-weight: 700;
  color: #ea4335;
  line-height: 1.5;
  word-break: break-all;
}

/* 用户消息附带的文件标签 */
.msg-files {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
  justify-content: flex-end;
}
.msg-file-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border: 1.5px solid var(--ink, #1f1f1f);
  border-radius: 6px;
  background: var(--c-blue-soft, #e8f0fe);
  color: var(--ink, #1f1f1f);
}

/* ---------- 夜间模式 ---------- */
html.dark .ai-page,
html.dark .chat { background: var(--paper); }
html.dark .welcome-title { color: var(--ink); }
html.dark .welcome-sub { color: var(--ink-55); }
html.dark .msg-row.assistant .bubble {
  background: var(--card);
  color: var(--ink);
  box-shadow: 3px 3px 0 #000;
}
html.dark .input-card { background: var(--card); box-shadow: 4px 4px 0 #000; }
html.dark .input-area { color: var(--ink); }
html.dark .input-area::placeholder { color: var(--ink-35); }
html.dark .send-btn:disabled { background: #34343e; color: #6b6b76; box-shadow: 2px 2px 0 #000; }

html.dark .rail { background: var(--card); }
html.dark .rail-head { border-color: var(--ink-25); }
html.dark .rail-tabs { border-color: var(--ink); background: var(--card); }
html.dark .rail-tab { color: var(--ink-55); }
html.dark .rail-tab:hover { color: var(--ink); }
html.dark .rail-tab.active { color: #7eb0f7; border-bottom-color: #7eb0f7; }
html.dark .rail-tab-close:hover { background: var(--hover-bg); color: var(--ink); }
html.dark .rail-group { color: var(--ink-40); }
html.dark .rail-item { color: var(--ink-70); }
html.dark .rail-item:hover { background: var(--hover-bg); }
html.dark .rail-item.active { background: var(--c-blue-soft); color: #7eb0f7; }
html.dark .rail-item.active .rail-ico { color: #7eb0f7; }
html.dark .rail-ico { color: var(--ink-40); }
html.dark .rail-del:hover { color: var(--c-red); background: var(--c-red-soft); }
html.dark .rail-empty { color: var(--ink-40); }
/* 高饱和黄按钮：深色字与墨线保持贴纸感 */
html.dark .rail-new,
html.dark .rail-reopen { color: #1f1f1f; border-color: #1f1f1f; }
html.dark .rail-new { box-shadow: 2px 2px 0 #000; }
html.dark .rail-reopen { box-shadow: 2px 2px 0 #000; }

/* 知识库暗色适配 */
html.dark .kb-panel { background: transparent; }
html.dark .kb-drop { border-color: var(--ink-35); background: rgba(123, 176, 247, 0.06); }
html.dark .kb-drop:hover { border-color: #7eb0f7; background: rgba(123, 176, 247, 0.12); }
html.dark .kb-drop-title { color: var(--ink); }
html.dark .kb-drop-sub,
html.dark .kb-drop-hint { color: var(--ink-55); }
html.dark .kb-item { background: var(--card); border-color: var(--ink-25); color: var(--ink); }
html.dark .kb-item:hover { border-color: var(--ink); }
html.dark .kb-item.uploading { border-color: #7eb0f7; background: rgba(123, 176, 247, 0.06); }
html.dark .kb-item.error { border-color: var(--c-red); }
html.dark .kb-item.summarizing { border-color: var(--c-yellow); }
html.dark .kb-item.done { border-color: var(--c-green); }
html.dark .kb-name { color: var(--ink); }
html.dark .kb-meta { color: var(--ink-55); }
html.dark .kb-ext { color: #7eb0f7; }
html.dark .kb-ico { border-color: var(--ink); background: rgba(123, 176, 247, 0.12); color: #7eb0f7; }
html.dark .kb-del { background: var(--card); color: var(--ink-55); border-color: var(--ink-25); }
html.dark .kb-del:hover { color: var(--c-red); border-color: var(--c-red); }
html.dark .kb-btn { box-shadow: 2px 2px 0 #000; }
html.dark .kb-empty { color: var(--ink-40); }

html.dark .action-card,
html.dark .src-chip { background: var(--card); color: var(--ink); }
html.dark .ac-plan { border-color: var(--ink-25); }
html.dark .ac-desc,
html.dark .ac-dismissed { color: var(--ink-55); }
html.dark .ac-done { background: #14301d; border-color: #34A853; }
html.dark .ac-done-text { color: #6fd088; }
html.dark .ac-ico { background: var(--c-blue-soft); }

/* ---------- 响应式 ---------- */
@media (max-width: 760px) {
  .rail {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    width: 80%;
    max-width: 280px;
    box-shadow: -6px 0 0 var(--ink, #1f1f1f);
  }
  .msg-row {
    padding: 0 14px;
  }
  .input-bar {
    padding: 8px 14px 18px;
  }
}
</style>
