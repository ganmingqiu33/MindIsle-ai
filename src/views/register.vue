<template>
  <div class="register-page">
    <router-link to="/" class="back-home">
      <el-icon><ArrowLeft /></el-icon>
      <span>返回首页</span>
    </router-link>

    <div class="form-wrap">
      <h1 class="form-title">创建您的账户</h1>
      <p class="form-subtitle">请填写注册信息</p>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="register-form"
        @submit.prevent
      >
        <el-form-item prop="account">
          <el-input
            v-model="form.account"
            placeholder="用户名或邮箱"
            size="large"
          />
        </el-form-item>

        <el-form-item prop="email">
          <el-input
            v-model="form.email"
            placeholder="请输入邮箱"
            size="large"
          />
        </el-form-item>

        <el-form-item prop="nickname">
          <el-input
            v-model="form.nickname"
            placeholder="请输入昵称（可选）"
            size="large"
          />
        </el-form-item>

        <el-form-item prop="phone">
          <el-input
            v-model="form.phone"
            placeholder="请输入手机号（可选）"
            size="large"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            show-password
          />
        </el-form-item>

        <el-form-item prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            size="large"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="submit-btn"
            @click="handleSubmit"
          >
            创建用户
          </el-button>
        </el-form-item>

        <p class="switch-link">
          已有账户？
          <router-link to="/author/login">立即登录</router-link>
        </p>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'

const formRef = ref()

const form = reactive({
  account: '',
  email: '',
  nickname: '',
  phone: '',
  password: '',
  confirmPassword: '',
})

const validateConfirm = (rule, value, callback) => {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  account: [
    { required: true, message: '请输入用户名或邮箱', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' },
  ],
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  console.log('注册数据：', { ...form })
  // TODO: 调后端注册接口
}
</script>

<style scoped>
.register-page {
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* 返回首页 */
.back-home {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #7a92a8;
  text-decoration: none;
  transition: color 0.2s;
}

.back-home:hover {
  color: #409eff;
}

/* 标题区 */
.form-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a3a5c;
  margin: 0;
}

.form-subtitle {
  font-size: 14px;
  color: #8a9ab0;
  margin: 0 0 28px;
}

/* 表单 */
.register-form {
  width: 100%;
}

.register-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.register-form :deep(.el-input__wrapper) {
  border-radius: 8px;
  padding: 4px 12px;
}

/* 注册按钮 */
.submit-btn {
  width: 100%;
  border-radius: 8px;
  font-weight: 500;
  margin-top: 4px;
}

/* 切换链接 */
.switch-link {
  text-align: center;
  font-size: 14px;
  color: #8a9ab0;
  margin: 4px 0 0;
}

.switch-link a {
  color: #409eff;
  text-decoration: none;
  font-weight: 500;
}

.switch-link a:hover {
  text-decoration: underline;
}
</style>
