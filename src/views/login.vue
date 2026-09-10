<template>
  <div class="login-page">
    <router-link to="/" class="back-home">
      <el-icon><ArrowLeft /></el-icon>
      <span>返回首页</span>
    </router-link>

    <div class="form-wrap">
      <h1 class="form-title">登录您的账户</h1>
      <p class="form-subtitle">请输入您的登录信息</p>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="login-form"
        @submit.prevent
      >
        <el-form-item prop="account">
          <el-input
            v-model="form.account"
            placeholder="用户名或邮箱"
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

        <div class="form-extra">
          <el-checkbox v-model="form.remember">记住我</el-checkbox>
          <a class="forgot-link" href="#">忘记密码？</a>
        </div>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="submit-btn"
            :loading="loading"
            @click="handleSubmit"
          >
            登录账户
          </el-button>
        </el-form-item>

        <p class="switch-link">
          还没有账户？
          <router-link to="/author/register">立即注册</router-link>
        </p>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login } from '@/api/admin'

const router = useRouter()
const formRef = ref()
const loading = ref(false)

const form = reactive({
  account: '',
  password: '',
  //remember: false,
})

const rules = {
  account: [
    { required: true, message: '请输入用户名或邮箱', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    const res = await login({ ...form })
    // 登录成功，保存 token 和用户信息
    localStorage.setItem('token', res.token)
    localStorage.setItem('userInfo', JSON.stringify(res.userInfo || {}))
    ElMessage.success('登录成功')
    router.push('/back/dashboard')
  } catch (err) {
    // 拦截器已弹错误提示，这里只需阻止跳转
    console.error('登录失败：', err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 40px;
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
  margin: 0 0 32px;
}

/* 表单 */
.login-form {
  width: 100%;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 8px;
  padding: 4px 12px;
}

/* 记住我 / 忘记密码 */
.form-extra {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  font-size: 14px;
}

.forgot-link {
  color: #7a92a8;
  text-decoration: none;
  transition: color 0.2s;
}

.forgot-link:hover {
  color: #409eff;
}

/* 登录按钮 */
.submit-btn {
  width: 100%;
  border-radius: 8px;
  font-weight: 500;
}

/* 切换链接 */
.switch-link {
  text-align: center;
  font-size: 14px;
  color: #8a9ab0;
  margin: 8px 0 0;
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
