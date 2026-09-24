import { loadUserData, saveUserData } from '@/api/front'
import { scopedKey } from '@/utils/storageScope'

/**
 * 用户数据服务端同步工具
 *
 * 策略：localStorage 作即时缓存，服务端作权威存储。
 * - pullFromServer(type)：异步从服务端拉取，有则覆盖本地
 * - pushToServer(type, data)：异步写入服务端（失败不阻塞 UI）
 */

const isLoggedIn = () => !!localStorage.getItem('frontToken')

// 写入 localStorage（按账号隔离）
function saveLocal(type, data) {
  try {
    localStorage.setItem(scopedKey(type), JSON.stringify(data))
  } catch {}
}

// 从服务端拉取数据（异步）
export async function pullFromServer(type) {
  if (!isLoggedIn()) return null
  try {
    const res = await loadUserData(type)
    if (res && res.data != null) {
      const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
      saveLocal(type, parsed)
      return parsed
    }
  } catch {
    /* 服务端无数据或请求失败，保持本地 */
  }
  return null
}

// 推送到服务端（异步，不阻塞）
export async function pushToServer(type, data) {
  if (!isLoggedIn()) return
  try {
    await saveUserData(type, data)
  } catch {
    /* 推送失败，下次拉取时会以服务端为准 */
  }
}
