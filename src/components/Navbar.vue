<template>
  <div class="navbar">
    <el-button class="toggle-btn" @click="handleCollapse">
      <el-icon :size="18">
        <Expand v-if="adminStore.isCollapse" />
        <Fold v-else />
      </el-icon>
    </el-button>
    <p class="page-title">导航栏</p>

    <el-dropdown
      class="user-dropdown"
      trigger="click"
      @command="handleCommand"
    >
      <div class="user-info">
        <el-avatar :size="32" class="user-avatar">
          <el-icon><UserFilled /></el-icon>
        </el-avatar>
        <span class="user-name">{{ userName }}</span>
        <el-icon class="user-arrow"><ArrowDown /></el-icon>
      </div>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="logout">
            <el-icon><SwitchButton /></el-icon>
            退出登录
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useadminStore } from '@/stores/admin'

const adminStore = useadminStore()
const userName = ref('管理员')

const handleCollapse = () => {
  adminStore.toggleCollapse()
}
const handleCommand = (command) => {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning',
    })
      .then(() => {
        localStorage.removeItem('token')
        ElMessage.success('已退出登录')
        // 待登录页/路由就绪后，可在此跳转：router.push('/login')
      })
      .catch(() => {})
  }
}
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 60px;
  padding: 0 20px;
  background-color: #ffffff;
  border-bottom: 1px solid var(--el-border-color-light);
  box-sizing: border-box;
}

.toggle-btn {
  color: #303133;
  background-color: #ffffff;
  border: 1px solid #dcdfe6;
  padding: 8px 12px;
}

.toggle-btn:hover,
.toggle-btn:focus {
  color: #303133;
  background-color: #f5f7fa;
  border-color: #c8cdd4;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
}

.user-dropdown {
  margin-left: auto;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  outline: none;
}

.user-info:hover {
  background-color: #f5f7fa;
}

.user-avatar {
  background-color: #c0c4cc;
}

.user-name {
  font-size: 14px;
  color: #303133;
}

.user-arrow {
  font-size: 12px;
  color: #909399;
}
</style>
