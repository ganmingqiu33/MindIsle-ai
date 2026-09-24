import { ref, computed } from 'vue'
import { userLogin, userRegister, userUpdatePassword, userUpdateProfile } from '@/api/front'

// 用户端登录态（与后台 admin 的 token 互不影响）
const TOKEN_KEY = 'frontToken'
const USER_KEY = 'frontUser'
const REGISTERED_KEY = 'frontRegistered'
// 内置测试账号改过的密码：硬编码账号无法改写，单独存覆盖表
const PWD_OVERRIDE_KEY = 'frontPwdOverrides'

// 模块级单例，Landing / Layout / Login 共享同一份状态
// 服务端账号体系上线后，旧的本地兜底令牌（local-token-*）视为无效，需重新登录
if ((localStorage.getItem(TOKEN_KEY) || '').startsWith('local-token-')) {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
const token = ref(localStorage.getItem(TOKEN_KEY) || '')
const user = ref(JSON.parse(localStorage.getItem(USER_KEY) || 'null'))

const isLoggedIn = computed(() => !!token.value)

const saveLogin = (tokenVal, userVal) => {
  token.value = tokenVal
  user.value = userVal
  localStorage.setItem(TOKEN_KEY, tokenVal)
  localStorage.setItem(USER_KEY, JSON.stringify(userVal))
}

const getRegistered = () => {
  try {
    return JSON.parse(localStorage.getItem(REGISTERED_KEY)) || []
  } catch {
    return []
  }
}

// 判断是否「接口不存在 / 服务不可用」（Mock 阶段用本地账号兜底）
const isApiMissing = (err) => {
  const status = err?.response?.status
  return (
    err?.message === 'Network Error' ||
    status === 404 ||
    status === 501 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    (err?.isAxiosError && !err.response)
  )
}

// 内置测试账号改过的密码（覆盖默认 123456）
const getPwdOverrides = () => {
  try {
    return JSON.parse(localStorage.getItem(PWD_OVERRIDE_KEY)) || {}
  } catch {
    return {}
  }
}

// 本地兜底认证：测试账号 demo@xinyu.com / 123456 + 本地注册的账号
const localLogin = (account, password) => {
  const overrides = getPwdOverrides()
  const accounts = [
    { email: 'demo@xinyu.com', password: overrides['demo@xinyu.com'] || '123456' },
    ...getRegistered(),
  ]
  const found = accounts.find((a) => a.email === account)
  if (!found) return { ok: false, msg: '邮箱不存在' }
  if (found.password !== password) return { ok: false, msg: '密码错误' }
  return {
    ok: true,
    token: 'local-token-' + Date.now(),
    userInfo: { id: found.id || 1, email: found.email, nickname: found.nickname || found.email },
  }
}

const login = async (form) => {
  try {
    const res = await userLogin(form)
    saveLogin(res.token, res.userInfo || { email: form.email })
    return { ok: true }
  } catch (err) {
    // auth-service 不可用时本地兜底
    if (isApiMissing(err)) {
      const r = localLogin(form.email, form.password)
      if (r.ok) {
        saveLogin(r.token, r.userInfo)
        return { ok: true }
      }
      return { ok: false, msg: r.msg }
    }
    // 真实后端返回的业务错误（密码错误等）
    return { ok: false, msg: err?.msg || '登录失败，请稍后再试' }
  }
}

const register = async (form) => {
  try {
    const res = await userRegister(form)
    saveLogin(res.token, res.userInfo || { email: form.email, nickname: form.nickname })
    return { ok: true }
  } catch (err) {
    if (isApiMissing(err)) {
      // 本地兜底：查重后注册并自动登录
      const accounts = getRegistered()
      if (form.email === 'demo@xinyu.com' || accounts.some((a) => a.email === form.email)) {
        return { ok: false, msg: '该邮箱已注册' }
      }
      const newUser = {
        id: Date.now(),
        email: form.email,
        password: form.password,
        nickname: form.nickname || form.email.split('@')[0],
      }
      accounts.push(newUser)
      localStorage.setItem(REGISTERED_KEY, JSON.stringify(accounts))
      saveLogin('local-token-' + Date.now(), {
        id: newUser.id,
        email: newUser.email,
        nickname: newUser.nickname,
      })
      return { ok: true }
    }
    return { ok: false, msg: err?.msg || '注册失败，请稍后再试' }
  }
}

const logout = () => {
  token.value = ''
  user.value = null
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/* ---------- 编辑资料（昵称 / 站内头像） ---------- */
const updateProfile = (patch) => {
  if (!user.value) return
  user.value = { ...user.value, ...patch }
  localStorage.setItem(USER_KEY, JSON.stringify(user.value))
  // 同步到服务端
  userUpdateProfile(patch).catch(() => {})
  // 本地注册账号：同步昵称，兜底登录后保持一致
  if (patch.nickname) {
    const accounts = getRegistered()
    const acc = accounts.find((a) => a.email === user.value.email)
    if (acc) {
      acc.nickname = patch.nickname
      localStorage.setItem(REGISTERED_KEY, JSON.stringify(accounts))
    }
  }
}

/* ---------- 修改密码：优先真实接口，接口缺失时本地兜底 ---------- */
const changePassword = async ({ oldPassword, newPassword }) => {
  try {
    await userUpdatePassword({ oldPassword, newPassword })
    return { ok: true }
  } catch (err) {
    if (!isApiMissing(err)) {
      return { ok: false, msg: err?.msg || '密码修改失败，请稍后再试' }
    }
    const email = user.value?.email
    if (!email) return { ok: false, msg: '登录状态已失效，请重新登录' }

    const accounts = getRegistered()
    const acc = accounts.find((a) => a.email === email)
    const overrides = getPwdOverrides()
    // 本地注册账号以注册记录为准；内置账号取覆盖表，默认 123456
    const currentPwd = acc
      ? acc.password
      : email === 'demo@xinyu.com'
        ? (overrides['demo@xinyu.com'] || '123456')
        : null
    if (currentPwd == null) return { ok: false, msg: '本地账号信息缺失，请重新登录后再试' }
    if (currentPwd !== oldPassword) return { ok: false, msg: '原密码不正确' }

    if (acc) {
      acc.password = newPassword
      localStorage.setItem(REGISTERED_KEY, JSON.stringify(accounts))
    } else {
      overrides[email] = newPassword
      localStorage.setItem(PWD_OVERRIDE_KEY, JSON.stringify(overrides))
    }
    return { ok: true }
  }
}

export function useFrontAuth() {
  return { token, user, isLoggedIn, login, register, logout, updateProfile, changePassword }
}
