import { createRouter, createWebHistory } from 'vue-router'
import FrontendLayout from '@/components/FrontendLayout.vue'

const routes = [
  {
    // 根路径：进用户端落地页（后台直达 /back/*）
    path: '/',
    redirect: '/front/landing',
  },
  {
    // 兜底：匹配不到的任意路径统一回到首页
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
  {
    // 用户端落地页（全屏独立页，不带布局）
    path: '/front/landing',
    component: () => import('@/views/front/Landing.vue'),
    meta: { title: '心屿 XINYU' },
  },
  {
    // 用户端登录页（全屏独立页，不带布局）
    path: '/front/login',
    component: () => import('@/views/front/Login.vue'),
    meta: { title: '登录 / 注册' },
  },
  {
    // 用户端工作台
    path: '/front',
    component: FrontendLayout,
    children: [
      { path: '', redirect: '/front/dashboard' },
      {
        path: 'dashboard',
        component: () => import('@/views/front/Dashboard.vue'),
        meta: { title: '仪表盘', requiresAuth: true },
      },
      {
        path: 'plans',
        component: () => import('@/views/front/Plans.vue'),
        meta: { title: '时间计划', requiresAuth: true },
      },
      {
        path: 'diary',
        component: () => import('@/views/front/Diary.vue'),
        meta: { title: '心情日记', requiresAuth: true },
      },
      {
        path: 'focus',
        component: () => import('@/views/front/Focus.vue'),
        meta: { title: '专注记录', requiresAuth: true },
      },
      {
        path: 'stats',
        component: () => import('@/views/front/Stats.vue'),
        meta: { title: '数据总结', requiresAuth: true },
      },
      {
        path: 'ai',
        component: () => import('@/views/front/AiChat.vue'),
        meta: { title: '心屿 AI', requiresAuth: true },
      },
      {
        path: 'profile',
        component: () => import('@/views/front/Profile.vue'),
        meta: { title: '我的主页', requiresAuth: true },
      },
      {
        path: 'messages',
        component: () => import('@/views/front/Messages.vue'),
        meta: { title: '消息中心', requiresAuth: true },
      },
    ],
  },
  {
    path: '/author',
    component: () => import('@/components/AuthorLayout.vue'),
    children: [
      {
        path: 'login',
        component: () => import('@/views/login.vue'),
        meta: { title: '登录' },
      },
      {
        path: 'register',
        component: () => import('@/views/register.vue'),
        meta: { title: '注册' },
      },
    ],
  },
  {
    path: '/back',
    component: () => import('@/components/BackendLayout.vue'),
    children: [
      {
        path: 'dashboard',
        component: () => import('@/views/dashboard.vue'),
        meta: { title: '数据分析', icon: 'DataLine' },
      },
      {
        path: 'knowledge',
        component: () => import('@/views/knowledge.vue'),
        meta: { title: '知识文章', icon: 'Reading' },
      },
      {
        path: 'consultations',
        component: () => import('@/views/consultations.vue'),
        meta: { title: '咨询记录', icon: 'Message' },
      },
      {
        path: 'emotional',
        component: () => import('@/views/emotional.vue'),
        meta: { title: '情绪日志', icon: 'User' },
      },
      {
        path: 'users',
        component: () => import('@/views/users.vue'),
        meta: { title: '用户与邮件', icon: 'Message' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 用户端登录守卫：未登录访问 /front 内页 → 登录页（带 redirect）
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !localStorage.getItem('frontToken')) {
    return { path: '/front/login', query: { redirect: to.fullPath } }
  }
  // 已登录再访问登录页 → 直接进仪表盘
  if (to.path === '/front/login' && localStorage.getItem('frontToken')) {
    return { path: '/front/dashboard' }
  }
  return true
})

export default router
