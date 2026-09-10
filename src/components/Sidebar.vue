<template>
  <el-aside
    :width="isCollapse ? '64px' : '264px'"
    class="sidebar-aside"
  >
    <div class="brand" :class="{ 'brand-collapsed': isCollapse }">
      <el-image :src="logoUrl" alt="logo" class="brand-logo" />
      <div v-show="!isCollapse" class="info-card">
        <h1 class="brand-title">心屿AI</h1>
        <p class="brand-subtitle">管理后台</p>
      </div>
    </div>
    <el-menu
      :default-active="activeMenu"
      router
      class="menu-style"
      :collapse="isCollapse"
    >
      <el-menu-item
        v-for="item in menuRoutes"
        :key="item.path"
        :index="`/back/${item.path}`"
      >
        <el-icon><component :is="item.meta.icon" /></el-icon>
        <span>{{ item.meta.title }}</span>
      </el-menu-item>
    </el-menu>
  </el-aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import logoUrl from '@/assets/images/logo.png'
import { useadminStore } from '@/stores/admin'

const adminStore = useadminStore()
const router = useRouter()
const route = useRoute()

const isCollapse = computed(() => adminStore.isCollapse)

const menuRoutes = computed(() => {
  const backendRoute = router.options.routes.find(
    (r) => r.path === '/back' && r.children
  )
  return backendRoute ? backendRoute.children : []
})

const activeMenu = computed(() => route.path)
</script>

<style scoped>
.sidebar-aside {
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: #ffffff;
  border-right: 1px solid var(--el-border-color-lighter);
  overflow: hidden;
  transition: width 0.28s;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  flex-shrink: 0;
}

.brand-collapsed {
  justify-content: center;
  padding: 18px 0;
}

.brand-logo {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}

.brand-title {
  margin: 0;
  font-size: 18px;
  line-height: 1.2;
}

.brand-subtitle {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.menu-style {
  flex: 1;
  min-height: 0;
  height: auto;
  border-right: none;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
