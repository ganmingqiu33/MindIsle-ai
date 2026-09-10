<template>
  <div class="backend-layout">
    <el-container class="container">
      <Sidebar />
      <el-container class="main-container">
        <el-header class="main-header">
          <Navbar />
        </el-header>
        <el-main class="main-content">
          <div class="content-card">
            <router-view></router-view>
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>
<script setup>
import Sidebar from './Sidebar.vue'
import Navbar from './Navbar.vue'
</script>
<style scoped>
.backend-layout {
  height: 100vh;
}
.container {
  height: 100%;
}
.main-header {
  padding: 0;
  height: 60px;
  background-color: #ffffff;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.main-container {
  background-color: #f0f2f5;
}
.main-content {
  padding: 16px;
  background-color: #f0f2f5;
}
.content-card {
  min-height: 100%;
  padding: 20px;
  background-color: #ffffff;
  border-radius: 8px;
  box-sizing: border-box;
}
</style>
