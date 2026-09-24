import axios from 'axios'
import { ElMessage } from 'element-plus'

// 认证服务专用实例：baseURL = /auth-svc（Vite 代理转发到 auth-service:3002）
const authService = axios.create({
  baseURL: '/auth-svc',
  timeout: 15000,
})

authService.interceptors.response.use(
  (response) => {
    const { data, config } = response
    if (data.code === 200) {
      return data.data
    }
    if (!config.silent) ElMessage.error(data.msg || '请求失败')
    return Promise.reject(data)
  },
  (error) => {
    if (!error.config?.silent) ElMessage.error(error.message || '网络异常')
    return Promise.reject(error)
  }
)

// 用户端登录
export function userLogin(data) {
  return authService.post('/user/login', data, { silent: true })
}

// 用户端注册
export function userRegister(data) {
  return authService.post('/user/register', data, { silent: true })
}

// 用户端修改密码（认证服务校验 JWT）
export function userUpdatePassword(data) {
  const token = localStorage.getItem('frontToken')
  return authService.put('/user/updatePassword', data, {
    silent: true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

// 用户端更新资料（昵称 / 头像）
export function userUpdateProfile(data) {
  const token = localStorage.getItem('frontToken')
  return authService.put('/user/profile', data, {
    silent: true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

/* ---------- 站内信 ---------- */
export function getMessages() {
  const token = localStorage.getItem('frontToken')
  return authService.get('/user/messages', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

export function markMessageRead(id) {
  const token = localStorage.getItem('frontToken')
  return authService.put(`/user/messages/${id}/read`, {}, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

export function getUnreadCount() {
  const token = localStorage.getItem('frontToken')
  return authService.get('/user/messages/unread', {
    silent: true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

/* ---------- 用户数据同步（plans / diary / focus / chat / profile） ---------- */
export function loadUserData(type) {
  const token = localStorage.getItem('frontToken')
  return authService.get(`/user/data/${encodeURIComponent(type)}`, {
    silent: true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

export function saveUserData(type, data) {
  const token = localStorage.getItem('frontToken')
  return authService.put(
    `/user/data/${encodeURIComponent(type)}`,
    { data: typeof data === 'string' ? data : JSON.stringify(data) },
    {
      silent: true,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  )
}
