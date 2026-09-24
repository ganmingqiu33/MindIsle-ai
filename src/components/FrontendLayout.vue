<template>
  <div class="app">
    <!-- ========== 左侧导航（平铺菜单，无分组标签） ========== -->
    <aside class="sidebar" :class="{ collapsed: isCollapse }">
      <div class="side-top">
        <template v-if="!isCollapse">
          <div class="brand" @click="router.push('/front/dashboard')">
            <img class="brand-logo" :src="logoImg" alt="心屿" />
            <span class="brand-name">心屿</span>
          </div>
          <el-tooltip content="收起侧边栏" placement="bottom" :show-after="400">
            <button class="icon-btn" @click="isCollapse = true">
              <PanelIcon />
            </button>
          </el-tooltip>
        </template>
        <el-tooltip v-else content="打开侧边栏" placement="right" :show-after="200">
          <button class="icon-btn panel-toggle" @click="isCollapse = false">
            <PanelIcon />
          </button>
        </el-tooltip>
      </div>

      <nav class="side-menu" :class="{ center: isCollapse }">
        <el-tooltip
          v-for="item in menus"
          :key="item.path"
          :content="item.name"
          placement="right"
          :disabled="!isCollapse"
          :show-after="200"
        >
          <div
            class="menu-item"
            :class="{ active: route.path === item.path }"
            @click="goMenu(item)"
          >
            <KitIcon :name="item.icon" :size="21" class="menu-icon" />
            <span v-show="!isCollapse" class="menu-label">{{ item.name }}</span>
          </div>
        </el-tooltip>
      </nav>

      <!-- 底部：用户（点头像/名字进我的主页；箭头开精简菜单） -->
      <div class="side-footer" :class="{ center: isCollapse }">
        <div class="user-box" :class="{ center: isCollapse }" title="我的主页" @click="goProfile">
          <div class="avatar-wrap">
            <UserAvatar :avatar-id="user?.avatar" :size="30" />
            <span v-if="unreadCount > 0" class="avatar-dot"></span>
          </div>
          <div v-show="!isCollapse" class="user-meta">
            <span class="user-name">{{ displayName }}</span>
          </div>
        </div>
        <el-dropdown
          v-show="!isCollapse"
          trigger="click"
          placement="top-start"
          popper-class="user-popover"
          @command="handlePop"
        >
          <button class="user-caret-btn" title="更多">
            <el-icon :size="13"><CaretTop /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="m in popMenus"
                :key="m.key"
                :command="m.key"
                :icon="m.icon"
              >
                {{ m.name }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </aside>

    <!-- ========== 右侧内容（路由过渡） ========== -->
    <main class="content">
      <router-view v-slot="{ Component }">
        <transition name="slide-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- ========== 专注完成提示（跨页面，到点自动弹出） ========== -->
    <transition name="done-pop">
      <div v-if="doneShow" class="done-mask" @click.self="dismissDone">
        <div class="done-card">
          <div class="done-badge">✓</div>
          <h3 class="done-title">专注已完成</h3>
          <p class="done-text">
            {{ doneInfo.plannedMin }} 分钟 · {{ doneInfo.taskTitle || '自由专注' }}
          </p>
          <p class="done-sub">休息一下，准备开始下一轮吧。</p>
          <div class="done-foot">
            <button class="done-btn outline" @click="dismissDone">稍后再说</button>
            <button class="done-btn primary" @click="goNextRound">选择计划 · 开始新一轮</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, h, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Setting, SwitchButton, CaretTop } from '@element-plus/icons-vue'
import logoImg from '@/assets/images/logo.png'
import KitIcon from '@/components/front/KitIcon.vue'
import UserAvatar from '@/components/front/UserAvatar.vue'
import { useFrontAuth } from '@/utils/frontAuth'
import { useMessageStore } from '@/utils/messageStore'
import { doneSignal, lastDoneInfo } from '@/utils/focusStore'

// 侧栏开关图标（沿用原有左右分栏 SVG）
const PanelIcon = () =>
  h(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: 20,
      height: 20,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
    },
    [
      h('rect', { x: 3, y: 4, width: 18, height: 16, rx: 3 }),
      h('line', { x1: 9.5, y1: 4, x2: 9.5, y2: 20 }),
    ]
  )

const route = useRoute()
const router = useRouter()
const { user, logout } = useFrontAuth()

const isCollapse = ref(true)
const { unreadCount, refresh: refreshUnread } = useMessageStore()

const displayName = computed(() => user.value?.nickname || user.value?.email || '心屿用户')

onMounted(refreshUnread)

// 路由切换时刷新未读数（从消息页离开后也更新）
watch(() => route.path, () => refreshUnread())

/* 专注完成提示：到点 doneSignal 变化即弹出，跨页面可见 */
const doneShow = ref(false)
const doneInfo = ref({ plannedMin: 0, taskTitle: '' })
watch(doneSignal, () => {
  doneInfo.value = { ...lastDoneInfo.value }
  doneShow.value = true
})
const dismissDone = () => { doneShow.value = false }
const goNextRound = () => {
  doneShow.value = false
  if (route.path !== '/front/focus') router.push('/front/focus')
}

const goProfile = () => {
  if (route.path !== '/front/profile') router.push('/front/profile')
}

// 平铺菜单（无分组标签）
const menus = [
  { name: '仪表盘', path: '/front/dashboard', icon: 'dashboard' },
  { name: '时间计划', path: '/front/plans', icon: 'plans' },
  { name: '心情日记', path: '/front/diary', icon: 'diary' },
  { name: '专注记录', path: '/front/focus', icon: 'focus' },
  { name: '数据分析', path: '/front/stats', icon: 'stats' },
  { name: '心屿AI', path: '/front/ai', icon: 'ai' },
]

const goMenu = (item) => {
  if (route.path !== item.path) router.push(item.path)
}

// 精简后的用户弹窗：只保留设置、退出登录
const popMenus = [
  { name: '设置', key: 'setting', icon: Setting },
  { name: '退出登录', key: 'logout', icon: SwitchButton },
]

const handlePop = (key) => {
  if (key === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning',
    })
      .then(() => {
        logout()
        ElMessage.success('已退出登录')
        // 整页刷新：清空各数据单例，避免下个账号看到上一个账号的数据
        window.location.href = '/front/landing'
      })
      .catch(() => {})
  } else if (key === 'setting') {
    goProfile()
  }
}
</script>

<style scoped>
.app {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--paper);
  color: var(--ink);
}

/* ---------- 侧边栏 ---------- */
.sidebar {
  width: 256px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--card);
  border-right: 2px solid var(--ink);
  transition: width 0.25s var(--ease-smooth);
}
.sidebar.collapsed {
  width: 64px;
}

.side-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 12px;
}
.sidebar.collapsed .side-top {
  justify-content: center;
  padding: 14px 0;
}
.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
  min-width: 0;
}
.brand-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
}
.brand-name {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 2px;
  white-space: nowrap;
  color: var(--ink);
}
.icon-btn {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--ink-70);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.18s ease;
}
.icon-btn:hover {
  background: var(--hover-bg);
}
.panel-toggle {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--hover-bg);
}
.panel-toggle:hover {
  background: var(--hover-strong);
}

/* ---------- 菜单 ---------- */
.side-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
}
.side-menu.center {
  align-items: center;
  padding: 10px 0;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  padding: 0 14px;
  border: 2px solid transparent;
  border-radius: var(--radius-pill);
  font-size: 14.5px;
  font-weight: 600;
  color: var(--ink-70);
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.15s ease,
    transform 0.15s var(--ease-spring),
    box-shadow 0.15s var(--ease-smooth),
    color 0.15s ease;
}
.side-menu.center .menu-item {
  width: 44px;
  height: 44px;
  padding: 0;
  justify-content: center;
}
.menu-item:hover {
  background: var(--hover-bg);
}
/* 激活：黄色药丸 + 墨线描边 + 硬投影（高饱和底上固定深色字与线，夜间也保持贴纸感） */
.menu-item.active {
  background: var(--c-yellow);
  border-color: #1f1f1f;
  box-shadow: 2px 2px 0 #1f1f1f;
  color: #1f1f1f;
}
@media (prefers-reduced-motion: no-preference) {
  .menu-item:active {
    transform: translate(1px, 1px);
    box-shadow: 1px 1px 0 #1f1f1f;
  }
}
.menu-icon {
  flex-shrink: 0;
}
.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.avatar-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 11px;
  height: 11px;
  background: var(--c-red);
  border: 2px solid var(--card);
  border-radius: 50%;
  box-shadow: 0 0 0 1px #1f1f1f;
}

/* ---------- 底部用户 ---------- */
.side-footer {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 10px 12px;
  border-top: 1px solid var(--hover-strong);
}
.side-footer.center {
  justify-content: center;
}
.user-box {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.user-box:hover {
  background: var(--hover-bg);
}
.user-box.center {
  flex: none;
  justify-content: center;
  padding: 6px 0;
}
.user-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.user-name {
  font-size: 13.5px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-caret-btn {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-40);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.user-caret-btn:hover {
  background: var(--hover-bg);
  color: var(--ink);
}

/* ---------- 右侧 ---------- */
.content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  background: var(--paper);
}
.content > * {
  flex: 1;
  min-width: 0;
}

/* ---------- 专注完成提示（跨页面） ---------- */
.done-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(31, 31, 31, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.done-card {
  width: min(420px, 100%);
  background: #fff;
  border: 2px solid #1f1f1f;
  border-radius: 18px;
  box-shadow: 6px 6px 0 #1f1f1f;
  padding: 26px 24px 22px;
  text-align: center;
  position: relative;
}
.done-badge {
  width: 54px;
  height: 54px;
  margin: 0 auto 12px;
  border: 2px solid #1f1f1f;
  border-radius: 50%;
  background: #34a853;
  color: #fff;
  font-size: 28px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 3px 3px 0 #1f1f1f;
}
.done-title {
  margin: 0 0 6px;
  font-size: 19px;
  font-weight: 800;
  color: #1f1f1f;
}
.done-text {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 700;
  color: #1f1f1f;
}
.done-sub {
  margin: 0 0 18px;
  font-size: 12.5px;
  color: rgba(31, 31, 31, 0.55);
}
.done-foot {
  display: flex;
  gap: 10px;
  justify-content: center;
}
.done-btn {
  border: 2px solid #1f1f1f;
  border-radius: 999px;
  padding: 10px 20px;
  font-size: 13.5px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.done-btn.outline {
  background: #fff;
  color: #1f1f1f;
}
.done-btn.outline:hover {
  background: #f6f5f0;
}
.done-btn.primary {
  background: #34a853;
  color: #fff;
  box-shadow: 3px 3px 0 #1f1f1f;
}
.done-btn.primary:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #1f1f1f;
}
.done-btn.primary:active {
  transform: translate(2px, 2px);
  box-shadow: 0 0 0 #1f1f1f;
}
.done-pop-enter-active,
.done-pop-leave-active {
  transition: opacity 0.2s ease;
}
.done-pop-enter-active .done-card {
  transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.done-pop-enter-from,
.done-pop-leave-to {
  opacity: 0;
}
.done-pop-enter-from .done-card {
  transform: scale(0.85) translateY(-8px);
}
/* 夜间模式 */
html.dark .done-mask {
  background: rgba(0, 0, 0, 0.55);
}
html.dark .done-card {
  background: var(--card);
  border-color: var(--ink);
  box-shadow: 6px 6px 0 #000;
}
html.dark .done-badge {
  border-color: var(--ink);
  box-shadow: 3px 3px 0 #000;
}
html.dark .done-title,
html.dark .done-text {
  color: var(--ink);
}
html.dark .done-sub {
  color: var(--ink-55);
}
html.dark .done-btn {
  border-color: var(--ink);
}
html.dark .done-btn.outline {
  background: var(--card);
  color: var(--ink);
}
html.dark .done-btn.outline:hover {
  background: var(--hover-bg);
}
</style>

<!-- dropdown 渲染在 body 上，样式不能加 scoped -->
<style>
.user-popover.el-dropdown__popper {
  border-radius: 14px !important;
  padding: 6px !important;
  border: 1px solid #ececec !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1) !important;
}
.user-popover .el-dropdown-menu {
  padding: 2px;
  border: none;
  background: transparent;
}
.user-popover .el-dropdown-menu__item {
  border-radius: 8px;
  font-size: 14px;
  color: #1f1f1f;
}
.user-popover .el-dropdown-menu__item:hover {
  background: #f2f2f2;
  color: #1f1f1f;
}
/* 夜间模式 */
html.dark .user-popover.el-dropdown__popper {
  background: #26262e !important;
  border-color: #3a3a44 !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45) !important;
}
html.dark .user-popover .el-dropdown-menu__item {
  color: #e9e9ee;
}
html.dark .user-popover .el-dropdown-menu__item:hover {
  background: #34343e;
  color: #fff;
}
</style>
