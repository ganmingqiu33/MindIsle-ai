<template>
  <div class="auth-page">
    <!-- 返回落地页 -->
    <button class="back" @click="router.push('/front/landing')">
      <el-icon><ArrowLeft /></el-icon>
      <span>返回首页</span>
    </button>

    <div class="shell rv">
      <!-- 左侧品牌面板 -->
      <aside class="side">
        <span class="sd-deco sd-moon">☾</span>
        <span class="sd-deco sd-star a">✦</span>
        <span class="sd-deco sd-star b">✦</span>

        <div class="side-brand">
          <img class="side-logo" :src="logoImg" alt="心屿" />
          <div>
            <p class="sb-name">心屿</p>
            <p class="sb-en">MIND ISLE</p>
          </div>
        </div>

        <h2 class="side-title">欢迎登岛</h2>
        <p class="side-sub">心屿这座小岛，永远为你亮着灯。</p>

        <ul class="side-list">
          <li><i class="sl-check"><svg viewBox="0 0 12 12"><path d="M2 6.5 4.8 9 10 3.2" /></svg></i>AI 24 小时在线倾听，想说就说</li>
          <li><i class="sl-check"><svg viewBox="0 0 12 12"><path d="M2 6.5 4.8 9 10 3.2" /></svg></i>心情日记与专注记录，随时回看</li>
          <li><i class="sl-check"><svg viewBox="0 0 12 12"><path d="M2 6.5 4.8 9 10 3.2" /></svg></i>所有记录仅自己可见，安心存放</li>
        </ul>

        <div class="side-sticker float-y">🙂 今天，也要好好的</div>

        <svg class="sd-wave w1" viewBox="0 0 600 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 50 Q 120 12 240 50 T 480 50 T 720 50 V90 H0 Z" />
        </svg>
        <svg class="sd-wave w2" viewBox="0 0 600 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 62 Q 120 30 240 62 T 480 62 T 720 62 V90 H0 Z" />
        </svg>
      </aside>

      <!-- 右侧表单 -->
      <div class="panel">
        <!-- Tab 切换 -->
        <div class="tabs">
          <div class="tab" :class="{ active: mode === 'login' }" @click="switchMode('login')">
            登录
          </div>
          <div class="tab" :class="{ active: mode === 'register' }" @click="switchMode('register')">
            注册
          </div>
        </div>

        <!-- 登录表单 -->
        <el-form
          v-if="mode === 'login'"
          ref="loginRef"
          :model="loginForm"
          :rules="loginRules"
          class="form"
          @submit.prevent
        >
          <el-form-item prop="email">
            <el-input v-model="loginForm.email" size="large" placeholder="邮箱">
              <template #prefix><el-icon><Message /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              size="large"
              placeholder="密码"
              show-password
              @keyup.enter="handleLogin"
            >
              <template #prefix><el-icon><Lock /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-button
            type="primary"
            size="large"
            class="submit"
            :loading="loading"
            @click="handleLogin"
          >
            登 录
          </el-button>
        </el-form>

        <!-- 注册表单 -->
        <el-form
          v-else
          ref="registerRef"
          :model="registerForm"
          :rules="registerRules"
          class="form"
          @submit.prevent
        >
          <el-form-item prop="email">
            <el-input v-model="registerForm.email" size="large" placeholder="设置邮箱">
              <template #prefix><el-icon><Message /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item prop="nickname">
            <el-input v-model="registerForm.nickname" size="large" placeholder="设置昵称">
              <template #prefix><el-icon><Avatar /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="registerForm.password"
              type="password"
              size="large"
              placeholder="设置密码（至少 6 位）"
              show-password
            >
              <template #prefix><el-icon><Lock /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item prop="confirmPassword">
            <el-input
              v-model="registerForm.confirmPassword"
              type="password"
              size="large"
              placeholder="再次输入密码"
              show-password
              @keyup.enter="handleRegister"
            >
              <template #prefix><el-icon><Lock /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-button
            type="primary"
            size="large"
            class="submit"
            :loading="loading"
            @click="handleRegister"
          >
            注 册
          </el-button>
          <p class="tip">注册即代表同意《心屿用户协议》与《隐私政策》</p>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Message, Lock, Avatar } from '@element-plus/icons-vue'
import logoImg from '@/assets/images/logo.png'
import { useFrontAuth } from '@/utils/frontAuth'

const router = useRouter()
const route = useRoute()
const { login, register } = useFrontAuth()

const mode = ref(route.query.mode === 'register' ? 'register' : 'login')
const loading = ref(false)
const loginRef = ref()
const registerRef = ref()

const loginForm = reactive({ email: '', password: '' })
const registerForm = reactive({ email: '', nickname: '', password: '', confirmPassword: '' })

const loginRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

const validateConfirm = (_rule, value, callback) => {
  if (!value) callback(new Error('请再次输入密码'))
  else if (value !== registerForm.password) callback(new Error('两次输入的密码不一致'))
  else callback()
}

const registerRules = {
  email: [
    { required: true, message: '请设置邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  nickname: [
    { required: true, message: '请设置昵称', trigger: 'blur' },
    { min: 1, max: 20, message: '昵称长度为 1-20 位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请设置密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [{ required: true, validator: validateConfirm, trigger: 'blur' }],
}

const switchMode = (m) => {
  mode.value = m
}

// 切 tab 后清掉残留校验红字
watch(mode, () => {
  loginRef.value?.clearValidate?.()
  registerRef.value?.clearValidate?.()
})

const handleLogin = async () => {
  const valid = await loginRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  const res = await login({ ...loginForm })
  loading.value = false
  if (res.ok) {
    // 整页跳转：让计划/日记/聊天等数据单例按新账号重新装载（localStorage 按账号隔离）
    window.location.href = route.query.redirect || '/front/dashboard'
  } else {
    ElMessage.error(res.msg)
  }
}

const handleRegister = async () => {
  const valid = await registerRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  const res = await register({
    email: registerForm.email,
    nickname: registerForm.nickname,
    password: registerForm.password,
  })
  loading.value = false
  if (res.ok) {
    ElMessage.success('注册成功，欢迎登岛')
    window.setTimeout(() => { window.location.href = '/front/dashboard' }, 300)
  } else {
    ElMessage.error(res.msg)
  }
}
</script>

<style scoped>
/* ============================================================
   登录页强制浅色：与落地页一致，在作用域内重写设计令牌，
   并覆盖 element-plus 深色变量，html.dark 下也保持白底
   ============================================================ */
.auth-page {
  --ink: #1f1f1f;
  --paper: #f6f5f0;
  --card: #ffffff;
  --c-blue: #1a73e8;
  --c-yellow: #fbbc04;
  --ink-55: rgba(31, 31, 31, 0.55);
  --ink-40: rgba(31, 31, 31, 0.4);
  --ink-25: rgba(31, 31, 31, 0.22);
  --line: 2px solid var(--ink);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth: cubic-bezier(0.22, 1, 0.36, 1);

  /* 覆盖 element-plus 令牌，防止深色模式串色 */
  --el-bg-color: #fff;
  --el-fill-color-blank: #fff;
  --el-text-color-primary: #1f1f1f;
  --el-text-color-regular: #1f1f1f;
  --el-border-color: #1f1f1f;
  --el-color-primary: #1a73e8;

  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  background-color: var(--paper);
  background-image: radial-gradient(var(--ink-25) 1.4px, transparent 1.4px);
  background-size: 26px 26px;
  overflow: hidden;
}

/* 入场 */
.rv {
  opacity: 0;
  transform: translateY(24px);
  animation: rise 0.7s var(--ease-smooth) forwards;
}
@keyframes rise {
  to { opacity: 1; transform: none; }
}

/* 返回按钮 */
.back {
  position: absolute;
  top: 26px;
  left: 28px;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
  background: #fff;
  border: var(--line);
  border-radius: 999px;
  box-shadow: 2px 2px 0 var(--ink);
  cursor: pointer;
  transition: transform 0.15s var(--ease-spring), box-shadow 0.15s var(--ease-spring);
}
.back:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--ink);
}
.back:active {
  transform: translate(2px, 2px);
  box-shadow: 0 0 0 var(--ink);
}

/* ---------- 主体双卡 ---------- */
.shell {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 900px;
  display: grid;
  grid-template-columns: 0.92fr 1.08fr;
  background: var(--card);
  border: var(--line);
  border-radius: 28px;
  box-shadow: 8px 8px 0 var(--ink);
  overflow: hidden;
}

/* ---------- 左侧品牌面板 ---------- */
.side {
  position: relative;
  overflow: hidden;
  padding: 40px 38px 108px;
  background: var(--c-blue);
  border-right: var(--line);
  color: #fff;
  display: flex;
  flex-direction: column;
}
.side-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.side-logo {
  width: 46px;
  height: 46px;
  padding: 5px;
  box-sizing: border-box;
  object-fit: contain;
  background: #fff;
  border: var(--line);
  border-radius: 50%;
  box-shadow: 2px 2px 0 var(--ink);
}
.sb-name { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: 4px; }
.sb-en { margin: 2px 0 0; font-size: 10.5px; font-weight: 700; letter-spacing: 2.5px; opacity: 0.8; }

.side-title {
  margin: 30px 0 8px;
  font-size: 34px;
  font-weight: 900;
  letter-spacing: 4px;
  color: #fff;
}
.side-sub {
  margin: 0 0 24px;
  font-size: 14px;
  line-height: 1.8;
  letter-spacing: 1px;
  opacity: 0.92;
}
.side-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.side-list li {
  display: flex;
  align-items: center;
  gap: 11px;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.sl-check {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: var(--line);
  border-radius: 7px;
  box-shadow: 1.5px 1.5px 0 var(--ink);
}
.sl-check svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: var(--c-blue);
  stroke-width: 2.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.side-sticker {
  position: absolute;
  right: 24px;
  bottom: 26px;
  z-index: 2;
  background: #fff;
  color: var(--ink);
  border: var(--line);
  border-radius: 14px;
  box-shadow: 3px 3px 0 var(--ink);
  padding: 8px 14px;
  font-size: 12.5px;
  font-weight: 700;
  transform: rotate(3deg);
}

/* 装饰 */
.sd-deco {
  position: absolute;
  pointer-events: none;
  z-index: 0;
}
.sd-moon {
  top: 22px;
  right: 30px;
  font-size: 50px;
  line-height: 1;
  color: #fff;
  opacity: 0.95;
}
.sd-star {
  font-size: 20px;
  color: #fff;
  font-weight: 900;
}
.sd-star.a { top: 86px; right: 92px; font-size: 15px; transform: rotate(14deg); }
.sd-star.b { top: 150px; right: 26px; font-size: 13px; transform: rotate(-10deg); opacity: 0.85; }
.sd-wave {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 70px;
}
.sd-wave path { fill: rgba(255, 255, 255, 0.16); }
.sd-wave.w2 { height: 52px; }
.sd-wave.w2 path { fill: rgba(255, 255, 255, 0.3); }

@media (prefers-reduced-motion: no-preference) {
  .float-y { animation: bob 5s ease-in-out infinite; }
}
@keyframes bob {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -8px; }
}

/* ---------- 右侧表单面板 ---------- */
.panel {
  padding: 42px 42px 36px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* 分段 Tabs */
.tabs {
  display: flex;
  gap: 4px;
  padding: 5px;
  margin-bottom: 28px;
  background: var(--paper);
  border: var(--line);
  border-radius: 999px;
}
.tab {
  flex: 1;
  text-align: center;
  padding: 9px 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 3px;
  color: var(--ink-55);
  border-radius: 999px;
  cursor: pointer;
  user-select: none;
  transition:
    color 0.2s ease,
    background-color 0.2s var(--ease-smooth),
    box-shadow 0.2s var(--ease-smooth),
    transform 0.2s var(--ease-spring);
}
.tab.active {
  color: var(--ink);
  background: #fff;
  box-shadow: 2px 2px 0 var(--ink);
}

/* ---------- 表单贴纸化 ---------- */
.form :deep(.el-form-item) {
  margin-bottom: 18px;
}
.form :deep(.el-form-item__error) {
  color: #ea4335;
  font-weight: 700;
  padding-top: 4px;
}
.form :deep(.el-input__wrapper) {
  width: 100%;
  padding: 7px 15px;
  border-radius: 14px;
  background: #fff !important;
  box-shadow: 2px 2px 0 var(--ink), inset 0 0 0 2px var(--ink) !important;
  transition: transform 0.15s var(--ease-spring), box-shadow 0.15s var(--ease-spring);
}
.form :deep(.el-input__wrapper:hover) {
  box-shadow: 3px 3px 0 var(--ink), inset 0 0 0 2px var(--ink) !important;
}
.form :deep(.el-input__wrapper.is-focus),
.form :deep(.el-input__wrapper.is-focus:hover) {
  transform: translate(2px, 2px);
  box-shadow: 0 0 0 var(--ink), inset 0 0 0 2px var(--c-blue) !important;
}
.form :deep(.el-input__inner) {
  height: 30px;
  font-size: 14.5px;
  font-weight: 600;
  color: #1f1f1f !important;
  -webkit-text-fill-color: #1f1f1f;
  caret-color: var(--c-blue);
}
.form :deep(.el-input__inner::placeholder) {
  color: var(--ink-40);
  font-weight: 500;
  -webkit-text-fill-color: var(--ink-40);
}
.form :deep(.el-input__prefix-inner),
.form :deep(.el-input__suffix-inner) {
  color: var(--ink-55);
  font-size: 16px;
}
.form :deep(.el-input__suffix-inner .el-icon) {
  color: var(--ink-55);
  cursor: pointer;
}

/* 提交按钮：黄底贴纸 */
.submit.el-button {
  width: 100%;
  height: 48px;
  margin-top: 6px;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 8px;
  color: #1f1f1f !important;
  background: var(--c-yellow) !important;
  border: var(--line) !important;
  border-radius: 14px;
  box-shadow: 3px 3px 0 var(--ink);
  transition: transform 0.15s var(--ease-spring), box-shadow 0.15s var(--ease-spring);
}
.submit.el-button:hover,
.submit.el-button:focus {
  color: #1f1f1f !important;
  background: var(--c-yellow) !important;
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--ink);
}
.submit.el-button:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--ink);
}
.submit.el-button.is-loading {
  transform: none;
  opacity: 0.85;
}

.tip {
  margin: 16px 0 0;
  text-align: center;
  font-size: 12.5px;
  color: var(--ink-40);
  letter-spacing: 0.5px;
}

/* ---------- 响应式 ---------- */
@media (max-width: 820px) {
  .shell {
    grid-template-columns: 1fr;
    max-width: 430px;
  }
  .side {
    display: none;
  }
  .panel {
    padding: 38px 30px 32px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rv,
  .float-y { animation: none; opacity: 1; transform: none; }
}
</style>
