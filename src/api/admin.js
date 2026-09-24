import service from '@/utils/request'
import axios from 'axios'
import { ElMessage } from 'element-plus'

// 认证服务专用实例（管理员登录 / 用户列表 / 发邮件）
const authService = axios.create({
  baseURL: '/auth-svc',
  timeout: 15000,
})

authService.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

authService.interceptors.response.use(
  (response) => {
    const { data, config } = response
    if (data.code === 200) return data.data
    if (!config.silent) ElMessage.error(data.msg || '请求失败')
    return Promise.reject(data)
  },
  (error) => {
    if (!error.config?.silent) ElMessage.error(error.message || '网络异常')
    return Promise.reject(error)
  }
)

// 管理员登录（走 auth-service）
export function login(data) {
  return authService.post('/admin/login', data, { silent: true })
}

// 管理员：获取用户列表
export function getUserList() {
  return authService.get('/admin/users')
}

// 管理员：给单个用户发邮件
export function sendEmail(data) {
  return authService.post('/admin/send-email', data)
}

// 管理员：群发邮件给所有用户
export function broadcastEmail(data) {
  return authService.post('/admin/broadcast-email', data)
}

// 获取文章分类树
export function categoryTree(params) {
  return service.get('/knowledge/category/tree', { params })
}

// 获取文章列表
export function getArticleList(params) {
  return service.get('/knowledge/article/list', { params })
}

// 获取文章详情
export function getArticleDetail(id) {
  return service.get(`/knowledge/article/${id}`)
}

// 新增文章
export function addArticle(data) {
  return service.post('/knowledge/article', data)
}

// 编辑文章
export function updateArticle(id, data) {
  return service.put(`/knowledge/article/${id}`, data)
}

// 删除文章
export function deleteArticle(id) {
  return service.delete(`/knowledge/article/${id}`)
}

// 文件上传
export function uploadFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  return service.post('/common/upload', formData)
}

// ---------- 咨询记录 ----------
export function getConsultationList(params) {
  return service.get('/consultations/list', { params })
}

// 咨询详情
export function getConsultationDetail(id) {
  return service.get(`/consultations/${id}`)
}

// ---------- 情绪日志 ----------
export function getEmotionLogList(params) {
  return service.get('/emotion/logs/list', { params })
}

// 情绪日志详情
export function getEmotionLogDetail(id) {
  return service.get(`/emotion/logs/${id}`)
}

// 删除情绪日志
export function deleteEmotionLog(id) {
  return service.delete(`/emotion/logs/${id}`)
}

// ---------- 数据分析 ----------
// 顶部统计卡片
export function getDashboardOverview(params, extra = {}) {
  return service.get('/dashboard/overview', { params, ...extra })
}

// 情绪趋势分析（平均情绪评分 + 记录数量）
export function getEmotionTrend(params, extra = {}) {
  return service.get('/dashboard/emotion-trend', { params, ...extra })
}

// 咨询会话统计（总览指标 + 柱状图）
export function getConsultationStats(params, extra = {}) {
  return service.get('/dashboard/consultation-stats', { params, ...extra })
}

// 用户活跃度趋势（活跃/新增/日记/咨询用户）
export function getActivityTrend(params, extra = {}) {
  return service.get('/dashboard/activity-trend', { params, ...extra })
}
