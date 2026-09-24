import { ref } from 'vue'

/* ============================================================
 * 夜间模式 · 模块级单例
 * 通过 <html class="dark"> 切换设计令牌（见 styles/tokens.css）
 * 选择持久化到 localStorage，模块被 import 时立即应用，避免刷新闪白
 * ============================================================ */

const THEME_KEY = 'xinyu-theme'

const initial = () => {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark'
  } catch {
    return false
  }
}

export const isDark = ref(initial())

const apply = (dark) => {
  document.documentElement.classList.toggle('dark', dark)
}

// 模块加载即同步到 <html>（main.js 中尽早引入）
apply(isDark.value)

export const setDark = (dark) => {
  isDark.value = !!dark
  try { localStorage.setItem(THEME_KEY, isDark.value ? 'dark' : 'light') } catch {}
  apply(isDark.value)
}

export const toggleDark = () => setDark(!isDark.value)
