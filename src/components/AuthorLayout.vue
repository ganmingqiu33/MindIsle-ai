<template>
  <div class="author-layout">
    <!-- 左半部分：网站封面 -->
    <div class="cover-section">
      <!-- 云层装饰 -->
      <div class="cloud cloud-1"></div>
      <div class="cloud cloud-2"></div>
      <div class="cloud cloud-3"></div>
      <div class="cloud cloud-4"></div>
      <!-- 光晕 -->
      <div class="light-glow"></div>

      <div class="cover-content">
        <div class="brand">
          <el-image :src="logoUrl" class="brand-logo" fit="contain" />
          <span class="brand-name">心屿</span>
        </div>

        <div class="slogan">
          <h1 class="slogan-main">守护每一颗心灵</h1>
          <p class="slogan-sub">温暖每一段旅程，让心理关怀触手可及</p>
        </div>

        <p class="copyright">© 2026 心屿AI · 心理健康服务平台</p>
      </div>
    </div>

    <!-- 右半部分：登录/注册表单 -->
    <div class="form-section">
      <router-view></router-view>
    </div>
  </div>
</template>

<script setup>
import logoUrl from '@/assets/images/logo.png'
</script>

<style scoped>
.author-layout {
  display: flex;
  height: 100vh;
  width: 100%;
}

/* ============ 左半部分：蓝天白云封面 ============ */
.cover-section {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 60px;
  overflow: hidden;
  /* 多层渐变叠加：从顶部浅天蓝到底部更深的蓝，营造天空的纵深感 */
  background:
    linear-gradient(180deg,
      #a8d8f0 0%,
      #bfe0f5 20%,
      #d4ebf7 40%,
      #e6f2fa 60%,
      #f0f6fb 100%
    );
}

/* 光晕 - 模拟阳光散射 */
.light-glow {
  position: absolute;
  width: 500px;
  height: 500px;
  top: -100px;
  right: -100px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 65%);
  pointer-events: none;
}

/* 云朵 - 用 border-radius 不规则圆 + 模糊模拟蓬松云 */
.cloud {
  position: absolute;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 50px;
  filter: blur(2px);
  pointer-events: none;
}

.cloud-1 {
  width: 200px;
  height: 60px;
  top: 18%;
  left: 10%;
  border-radius: 60px 40px 50px 45px;
  opacity: 0.7;
}

.cloud-2 {
  width: 280px;
  height: 75px;
  top: 30%;
  right: 8%;
  border-radius: 50px 60px 45px 55px;
  opacity: 0.6;
}

.cloud-3 {
  width: 160px;
  height: 45px;
  bottom: 25%;
  left: 15%;
  border-radius: 40px 50px 45px 35px;
  opacity: 0.55;
}

.cloud-4 {
  width: 220px;
  height: 55px;
  bottom: 15%;
  right: 12%;
  border-radius: 55px 45px 50px 40px;
  opacity: 0.5;
}

/* 内容区 */
.cover-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 40px;
  max-width: 440px;
}

/* 品牌区 */
.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-logo {
  width: 56px;
  height: 56px;
}

.brand-name {
  font-size: 28px;
  font-weight: 700;
  color: #1a3a5c;
  letter-spacing: 2px;
}

/* 标语区 */
.slogan {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.slogan-main {
  font-size: 38px;
  font-weight: 700;
  color: #1a3a5c;
  margin: 0;
  line-height: 1.3;
  text-shadow: 0 2px 12px rgba(255, 255, 255, 0.5);
}

.slogan-sub {
  font-size: 16px;
  color: #4a6a86;
  margin: 0;
  line-height: 1.6;
}

/* 底部版权 */
.copyright {
  margin: 0;
  font-size: 13px;
  color: #7a92a8;
}

/* ============ 右半部分：表单 ============ */
.form-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  padding: 40px;
}

/* ============ 响应式：小屏隐藏封面 ============ */
@media (max-width: 768px) {
  .cover-section {
    display: none;
  }
}
</style>
