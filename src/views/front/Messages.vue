<template>
  <div class="messages-page">
    <header class="topbar">
      <button class="back-btn" @click="goBack">
        <span class="back-chevron">‹</span>
        <span class="back-text">消息中心</span>
      </button>
      <span class="unread-tag" v-if="unreadCount > 0">{{ unreadCount }} 条未读</span>
    </header>

    <div class="msg-body">
      <div v-if="loading" class="empty">加载中…</div>
      <div v-else-if="messages.length === 0" class="empty">
        <div class="empty-icon">✉️</div>
        <p>还没有消息</p>
        <p class="empty-sub">管理员发来的通知会显示在这里</p>
      </div>
      <div v-else class="msg-list">
        <div
          v-for="m in messages"
          :key="m.id"
          class="msg-item"
          :class="{ unread: !m.is_read }"
          @click="openMsg(m)"
        >
          <div class="msg-dot" v-if="!m.is_read"></div>
          <div class="msg-main">
            <div class="msg-head">
              <span class="msg-subject">{{ m.subject }}</span>
              <span class="msg-time">{{ formatTime(m.created_at) }}</span>
            </div>
            <p class="msg-content">{{ m.content }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 消息详情弹层 -->
    <div v-if="detail.open" class="modal-mask" @click="detail.open = false">
      <div class="composer" @click.stop>
        <h3 class="dlg-title">{{ detail.subject }}</h3>
        <p class="detail-time">{{ formatTime(detail.created_at) }}</p>
        <div class="detail-content">{{ detail.content }}</div>
        <div class="dlg-foot">
          <button class="yellow-btn" @click="detail.open = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMessages } from '@/api/front'
import { useMessageStore } from '@/utils/messageStore'

const router = useRouter()
const { markRead, unreadCount, refresh: refreshUnread } = useMessageStore()
const loading = ref(true)
const messages = ref([])

const detail = reactive({ open: false, id: null, subject: '', content: '', created_at: '' })

const goBack = () => {
  if (window.history.state?.back) router.back()
  else router.replace('/front/dashboard')
}

const loadMessages = async () => {
  loading.value = true
  try {
    const res = await getMessages()
    messages.value = res.list || []
    refreshUnread()
  } catch {
    messages.value = []
  } finally {
    loading.value = false
  }
}

const openMsg = async (m) => {
  detail.id = m.id
  detail.subject = m.subject
  detail.content = m.content
  detail.created_at = m.created_at
  detail.open = true
  if (!m.is_read) {
    await markRead(m.id)
    m.is_read = 1
  }
}

const formatTime = (s) => {
  if (!s) return ''
  return s.replace('T', ' ').slice(0, 16)
}

onMounted(loadMessages)
</script>

<style scoped>
.messages-page {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: var(--paper);
}

.topbar {
  max-width: 620px;
  margin: 0 auto;
  padding: 18px 20px 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: none;
  background: transparent;
  padding: 6px 8px 6px 2px;
  cursor: pointer;
  font-family: inherit;
  color: var(--ink);
  border-radius: 10px;
}
.back-btn:hover { background: var(--hover-bg); }
.back-chevron { font-size: 24px; font-weight: 700; line-height: 1; margin-top: -2px; }
.back-text { font-size: 17px; font-weight: 800; }
.unread-tag {
  background: var(--c-red);
  color: #fff;
  border: 2px solid #1f1f1f;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 800;
  box-shadow: 2px 2px 0 #1f1f1f;
}

.msg-body {
  max-width: 620px;
  margin: 0 auto;
  padding: 10px 20px 40px;
}

.empty {
  text-align: center;
  padding: 80px 20px;
  color: var(--ink-55);
}
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty p { margin: 4px 0; font-size: 14px; }
.empty-sub { font-size: 12px; color: var(--ink-40); }

.msg-list { display: flex; flex-direction: column; gap: 10px; }
.msg-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: var(--card);
  border: var(--line);
  border-radius: var(--radius-card);
  padding: 16px 18px;
  cursor: pointer;
  transition: transform 0.15s var(--ease-spring), box-shadow 0.15s;
}
.msg-item:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #1f1f1f;
}
.msg-item.unread { background: var(--c-blue-soft); }
.msg-dot {
  width: 10px; height: 10px;
  background: var(--c-red);
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
  border: 1.5px solid #1f1f1f;
}
.msg-main { flex: 1; min-width: 0; }
.msg-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}
.msg-subject {
  font-size: 15px;
  font-weight: 800;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.msg-time {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--ink-40);
}
.msg-content {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--ink-70);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 弹层 */
.modal-mask {
  position: fixed; inset: 0;
  background: rgba(10, 10, 14, 0.42);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; padding: 20px;
}
.composer {
  width: min(480px, 100%);
  background: var(--card);
  border: var(--line);
  border-radius: 18px;
  box-shadow: var(--shadow-2);
  padding: 22px 24px;
  max-height: 88vh;
  overflow-y: auto;
}
.dlg-title { margin: 0; font-size: 17px; font-weight: 800; color: var(--ink); }
.detail-time { margin: 6px 0 14px; font-size: 12px; color: var(--ink-40); }
.detail-content {
  font-size: 14px;
  line-height: 1.8;
  color: var(--ink);
  white-space: pre-wrap;
  word-break: break-word;
}
.dlg-foot {
  display: flex; justify-content: flex-end;
  margin-top: 20px;
}
.yellow-btn {
  border-radius: 22px;
  padding: 9px 28px;
  font-size: 14px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  border: 2px solid #1f1f1f;
  background: var(--c-yellow);
  color: #1f1f1f;
  box-shadow: 3px 3px 0 #1f1f1f;
  transition: transform 0.14s var(--ease-spring), box-shadow 0.14s;
}
.yellow-btn:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 #1f1f1f; }
.yellow-btn:active { transform: translate(2px, 2px); box-shadow: 0 0 0 #1f1f1f; }
</style>
