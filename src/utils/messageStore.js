import { ref } from 'vue'
import { getUnreadCount, markMessageRead as apiMarkRead } from '@/api/front'

/**
 * 站内信未读数共享状态
 * 供 FrontendLayout（侧栏红点+头像红点）、Profile（消息入口红点）、
 * Messages（消息列表）共用，确保查看后红点同步消失
 */
const unreadCount = ref(0)
let refreshing = null

const refresh = async () => {
  if (refreshing) return refreshing
  refreshing = (async () => {
    try {
      const res = await getUnreadCount()
      unreadCount.value = res.unread || 0
    } catch {
      unreadCount.value = 0
    }
  })()
  try {
    await refreshing
  } finally {
    refreshing = null
  }
}

// 标记单条已读，并同步未读数
const markRead = async (id) => {
  try {
    await apiMarkRead(id)
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  } catch {}
}

// 全部已读后清零
const clearAll = () => {
  unreadCount.value = 0
}

export function useMessageStore() {
  return { unreadCount, refresh, markRead, clearAll }
}
