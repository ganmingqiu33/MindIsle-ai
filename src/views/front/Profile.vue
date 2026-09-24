<template>
  <div class="profile-page">
    <!-- 顶部：‹ 我的主页（整体点击返回） -->
    <header class="topbar">
      <button class="back-btn" @click="goBack">
        <span class="back-chevron">‹</span>
        <span class="back-text">我的主页</span>
      </button>
    </header>

    <div class="profile-body">
      <!-- 用户卡 -->
      <section class="p-card user-card">
        <UserAvatar :avatar-id="user?.avatar" :size="84" />
        <div class="user-info">
          <h2 class="user-nick">{{ displayName }}</h2>
          <p class="user-account">@{{ user?.email || '心屿用户' }}</p>
        </div>
        <button class="edit-btn" @click="openProfileDlg">
          <el-icon :size="15"><EditPen /></el-icon>
          <span>编辑资料</span>
        </button>
      </section>

      <!-- 消息中心入口（编辑资料下方） -->
      <button class="p-card msg-entry" @click="goMessages">
        <span class="msg-ico ico-blue"><el-icon :size="20"><Message /></el-icon></span>
        <div class="msg-main">
          <span class="msg-label">消息中心</span>
          <span class="msg-sub">{{ unreadCount > 0 ? `${unreadCount} 条未读` : '暂无新消息' }}</span>
        </div>
        <span v-if="unreadCount > 0" class="msg-red-dot">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        <el-icon class="row-arrow" :size="16"><ArrowRight /></el-icon>
      </button>

      <!-- AI 使用情况卡 -->
      <section class="p-card usage-card" @click="goAi">
        <span class="usage-num" :class="{ out: aiExhausted }">
          <b>{{ aiRemaining }}</b>
          <small>/{{ aiLimit }}</small>
        </span>
        <div class="usage-main">
          <div class="usage-head">
            <span class="usage-title">AI 对话次数</span>
            <span class="usage-tag" :class="{ out: aiExhausted }">
              {{ aiExhausted ? '今日已用完' : '今日剩余' }}
            </span>
          </div>
          <div class="usage-bar">
            <i
              v-for="n in aiLimit"
              :key="n"
              class="usage-seg"
              :class="{ on: n <= aiUsed, out: aiExhausted && n <= aiUsed }"
            />
          </div>
          <p class="usage-tip">每天 10 次 · 含知识库文件总结 · 次日 0 点重置</p>
        </div>
        <el-icon class="row-arrow usage-arrow" :size="16"><ArrowRight /></el-icon>
      </section>

      <!-- 设置卡 -->
      <section class="p-card setting-card">
        <h3 class="card-title">设置</h3>

        <button class="setting-row" @click="openPwdDlg">
          <span class="row-ico ico-blue"><el-icon :size="17"><Lock /></el-icon></span>
          <span class="row-label">修改密码</span>
          <el-icon class="row-arrow" :size="15"><ArrowRight /></el-icon>
        </button>

        <div class="setting-row">
          <span class="row-ico ico-purple"><el-icon :size="17"><Moon /></el-icon></span>
          <span class="row-label">夜间模式</span>
          <button
            class="switch"
            :class="{ on: isDark }"
            role="switch"
            :aria-checked="isDark"
            @click="setDark(!isDark)"
          >
            <span class="switch-knob"></span>
          </button>
        </div>
      </section>

      <!-- 退出登录 -->
      <button class="logout-btn" @click="askLogout">
        <el-icon :size="16"><SwitchButton /></el-icon>
        <span>退出登录</span>
      </button>
    </div>

    <!-- 编辑资料弹层（点遮罩不关闭，只能按钮关） -->
    <div v-if="profileDlg.open" class="modal-mask">
      <div class="composer" @click.stop>
        <h3 class="dlg-title">编辑资料</h3>

        <label class="field-label">昵称</label>
        <input v-model="profileDlg.nickname" class="text-input" maxlength="16" placeholder="给自己起个昵称" />

        <label class="field-label">头像（从心屿提供的头像中选择）</label>
        <div class="avatar-grid">
          <button
            v-for="a in AVATARS"
            :key="a.id"
            class="avatar-pick"
            :class="{ active: profileDlg.avatar === a.id }"
            @click="profileDlg.avatar = a.id"
          >
            <UserAvatar :avatar-id="a.id" :size="46" />
            <span v-if="profileDlg.avatar === a.id" class="pick-tick">✓</span>
          </button>
        </div>

        <p v-if="profileError" class="dlg-error">{{ profileError }}</p>
        <div class="dlg-foot">
          <button class="outline-btn" @click="profileDlg.open = false">取消</button>
          <button class="yellow-btn" @click="saveProfile">保存</button>
        </div>
      </div>
    </div>

    <!-- 修改密码弹层（点遮罩不关闭，只能按钮关） -->
    <div v-if="pwdDlg.open" class="modal-mask">
      <div class="composer" @click.stop>
        <h3 class="dlg-title">修改密码</h3>

        <label class="field-label">原密码</label>
        <input v-model="pwdDlg.oldPwd" type="password" class="text-input" placeholder="请输入原密码" />

        <label class="field-label">新密码</label>
        <input v-model="pwdDlg.newPwd" type="password" class="text-input" placeholder="6-20 位新密码" />

        <label class="field-label">确认新密码</label>
        <input
          v-model="pwdDlg.confirmPwd"
          type="password"
          class="text-input"
          placeholder="再次输入新密码"
          @keydown.enter="submitPwd"
        />

        <p v-if="pwdTouched && pwdError" class="dlg-error">{{ pwdError }}</p>
        <div class="dlg-foot">
          <button class="outline-btn" @click="pwdDlg.open = false">取消</button>
          <button class="yellow-btn" :disabled="submitting" @click="submitPwd">
            {{ submitting ? '提交中…' : '确认修改' }}
          </button>
        </div>
      </div>
    </div>
    <!-- 退出登录确认弹层（点遮罩不关闭，只能按钮关） -->
    <div v-if="logoutDlg" class="modal-mask">
      <div class="composer logout-composer" @click.stop>
        <span class="logout-ico"><el-icon :size="22"><SwitchButton /></el-icon></span>
        <h3 class="logout-title">退出登录</h3>
        <p class="logout-msg">确定要退出当前账号吗？</p>
        <div class="dlg-foot logout-foot">
          <button class="outline-btn" @click="logoutDlg = false">取消</button>
          <button class="red-btn" @click="confirmLogout">退出</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { EditPen, Lock, Moon, ArrowRight, SwitchButton, Message } from '@element-plus/icons-vue'
import UserAvatar from '@/components/front/UserAvatar.vue'
import { AVATARS } from '@/utils/avatars'
import { useFrontAuth } from '@/utils/frontAuth'
import { isDark, setDark } from '@/utils/theme'
import { useAiUsage } from '@/utils/usageStore'
import { useMessageStore } from '@/utils/messageStore'

const router = useRouter()
const { user, logout, updateProfile, changePassword } = useFrontAuth()
const { used: aiUsed, remaining: aiRemaining, exhausted: aiExhausted, limit: aiLimit, refreshQuota } = useAiUsage()
const { unreadCount, refresh: refreshUnread } = useMessageStore()

onMounted(() => {
  refreshQuota()
  refreshUnread()
})

const goAi = () => router.push('/front/ai')
const goMessages = () => router.push('/front/messages')

const displayName = computed(() => user.value?.nickname || user.value?.email || '心屿用户')

const goBack = () => {
  // 站内点进来有历史就回退，直接输 URL 进入则回仪表盘
  if (window.history.state?.back) router.back()
  else router.replace('/front/dashboard')
}

/* ---------- 编辑资料 ---------- */
const profileDlg = reactive({ open: false, nickname: '', avatar: 1 })
const profileError = computed(() => (profileDlg.nickname.trim() ? '' : '昵称不能为空'))

const openProfileDlg = () => {
  profileDlg.nickname = user.value?.nickname || user.value?.email || ''
  profileDlg.avatar = Number(user.value?.avatar) || 1
  profileDlg.open = true
}

const saveProfile = () => {
  const nickname = profileDlg.nickname.trim()
  if (!nickname) {
    ElMessage.warning('昵称不能为空')
    return
  }
  updateProfile({ nickname, avatar: profileDlg.avatar })
  profileDlg.open = false
  ElMessage.success('资料已更新')
}

/* ---------- 修改密码 ---------- */
const pwdDlg = reactive({ open: false, oldPwd: '', newPwd: '', confirmPwd: '' })
const pwdError = computed(() => {
  if (!pwdDlg.oldPwd) return '请输入原密码'
  if (!pwdDlg.newPwd) return '请输入新密码'
  if (pwdDlg.newPwd.length < 6 || pwdDlg.newPwd.length > 20) return '新密码长度需为 6-20 位'
  if (pwdDlg.newPwd === pwdDlg.oldPwd) return '新密码不能和原密码相同'
  if (pwdDlg.newPwd !== pwdDlg.confirmPwd) return '两次输入的新密码不一致'
  return ''
})
const submitting = ref(false)
const pwdTouched = ref(false)

const openPwdDlg = () => {
  pwdDlg.oldPwd = ''
  pwdDlg.newPwd = ''
  pwdDlg.confirmPwd = ''
  pwdTouched.value = false
  pwdDlg.open = true
}

const submitPwd = async () => {
  pwdTouched.value = true
  if (pwdError.value) {
    ElMessage.warning(pwdError.value)
    return
  }
  if (submitting.value) return
  submitting.value = true
  try {
    const r = await changePassword({ oldPassword: pwdDlg.oldPwd, newPassword: pwdDlg.newPwd })
    if (r.ok) {
      pwdDlg.open = false
      ElMessage.success('密码修改成功')
    } else {
      ElMessage.error(r.msg || '密码修改失败')
    }
  } finally {
    submitting.value = false
  }
}

/* ---------- 退出登录（统一贴纸风确认弹层） ---------- */
const logoutDlg = ref(false)
const askLogout = () => {
  logoutDlg.value = true
}
const confirmLogout = () => {
  logoutDlg.value = false
  logout()
  // 整页刷新：清空各数据单例，按未登录身份重新装载，避免下个账号看到上一个账号的数据
  window.location.href = '/front/landing'
}
</script>

<style scoped>
.profile-page {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: var(--paper);
}

/* ---------- 顶部返回 ---------- */
.topbar {
  max-width: 620px;
  margin: 0 auto;
  padding: 18px 20px 4px;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: none;
  background: transparent;
  padding: 6px 8px 6px 2px;
  cursor: pointer;
  font-family: inherit;
  color: var(--ink);
  border-radius: 10px;
  transition: background 0.15s ease;
}
.back-btn:hover {
  background: var(--hover-bg);
}
.back-chevron {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
  margin-top: -2px;
}
.back-text {
  font-size: 17px;
  font-weight: 800;
}

/* ---------- 主体 ---------- */
.profile-body {
  max-width: 620px;
  margin: 0 auto;
  padding: 10px 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.p-card {
  background: var(--card);
  border: var(--line);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-1);
}

/* 用户卡 */
.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
}
.user-info {
  flex: 1;
  min-width: 0;
}
.user-nick {
  margin: 0;
  font-size: 21px;
  font-weight: 800;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-account {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--ink-55);
}
.edit-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 2px solid #1f1f1f;
  border-radius: 999px;
  background: var(--c-yellow);
  color: #1f1f1f;
  padding: 9px 18px;
  font-size: 13.5px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 3px 3px 0 #1f1f1f;
  transition: transform 0.15s var(--ease-spring), box-shadow 0.15s;
}
.edit-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #1f1f1f;
}
.edit-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 0 0 0 #1f1f1f;
}

/* 消息中心入口 */
.msg-entry {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 22px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: transform 0.15s var(--ease-spring), box-shadow 0.15s;
}
.msg-entry:hover {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 #1f1f1f;
}
.msg-entry:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 #1f1f1f;
}
.msg-ico {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1.5px solid var(--ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ico-blue {
  background: var(--c-blue-soft);
  color: var(--c-blue);
}
.msg-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.msg-label {
  font-size: 15px;
  font-weight: 800;
  color: var(--ink);
}
.msg-sub {
  font-size: 12px;
  color: var(--ink-55);
}
.msg-red-dot {
  background: var(--c-red);
  color: #fff;
  border: 1.5px solid #1f1f1f;
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.5;
  box-shadow: 1px 1px 0 #1f1f1f;
}

/* AI 使用情况卡 */
.usage-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  cursor: pointer;
  transition: transform 0.15s var(--ease-spring), box-shadow 0.15s;
}
.usage-card:hover {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 #1f1f1f;
}
.usage-card:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 #1f1f1f;
}
/* 左侧剩余次数方块 */
.usage-num {
  flex-shrink: 0;
  width: 58px;
  height: 58px;
  border-radius: 16px;
  border: 2px solid #1f1f1f;
  background: var(--c-blue-soft);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
  box-shadow: 2px 2px 0 #1f1f1f;
}
.usage-num b {
  font-size: 23px;
  font-weight: 900;
  color: var(--c-blue);
  font-variant-numeric: tabular-nums;
}
.usage-num small {
  margin-top: 2px;
  font-size: 10.5px;
  font-weight: 800;
  color: rgba(31, 31, 31, 0.45);
}
.usage-num.out {
  background: var(--c-red-soft);
}
.usage-num.out b {
  color: var(--c-red);
}
.usage-main {
  flex: 1;
  min-width: 0;
}
.usage-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.usage-title {
  font-size: 14.5px;
  font-weight: 800;
  color: var(--ink);
}
.usage-tag {
  font-size: 10.5px;
  font-weight: 800;
  color: var(--c-blue);
  background: var(--c-blue-soft);
  border: 1.5px solid rgba(26, 115, 232, 0.5);
  border-radius: 999px;
  padding: 2px 9px;
}
.usage-tag.out {
  color: var(--c-red);
  background: var(--c-red-soft);
  border-color: rgba(234, 67, 53, 0.5);
}
.usage-bar {
  display: flex;
  gap: 6px;
  margin: 10px 0 7px;
}
.usage-seg {
  flex: 1;
  height: 9px;
  border-radius: 999px;
  border: 1.5px solid var(--ink);
  background: var(--card);
  transition: background 0.25s var(--ease-smooth);
}
.usage-seg.on {
  background: var(--c-blue);
}
.usage-seg.on.out {
  background: var(--c-red);
}
.usage-tip {
  margin: 0;
  font-size: 11.5px;
  color: var(--ink-55);
}
.usage-arrow {
  flex-shrink: 0;
  color: var(--ink-40);
}

/* 设置卡 */
.setting-card {
  padding: 6px 0;
  overflow: hidden;
}
.card-title {
  margin: 0;
  padding: 16px 22px 8px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--ink-55);
}
.setting-row {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 22px;
  border: none;
  background: transparent;
  font-family: inherit;
  text-align: left;
}
button.setting-row {
  cursor: pointer;
  transition: background 0.15s ease;
}
button.setting-row:hover {
  background: var(--hover-bg);
}
.row-ico {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1.5px solid var(--ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ico-blue {
  background: var(--c-blue-soft);
  color: var(--c-blue);
}
.ico-purple {
  background: var(--c-purple-soft);
  color: var(--c-purple);
}
.row-label {
  flex: 1;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--ink);
}
.row-arrow {
  color: var(--ink-40);
}

/* 夜间模式开关 */
.switch {
  width: 46px;
  height: 26px;
  border-radius: 999px;
  border: 2px solid var(--ink);
  background: var(--card);
  position: relative;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: background 0.2s ease;
}
.switch-knob {
  position: absolute;
  top: 50%;
  left: 3px;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--ink);
  transition: left 0.2s var(--ease-spring), background 0.2s ease;
}
.switch.on {
  background: var(--c-blue);
}
.switch.on .switch-knob {
  left: 21px;
  background: #fff;
}

/* 退出登录 */
.logout-btn {
  align-self: stretch;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 2px solid #1f1f1f;
  border-radius: var(--radius-card);
  background: var(--c-red);
  color: #fff;
  padding: 14px;
  font-size: 15px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 4px 4px 0 #1f1f1f;
  transition: transform 0.15s var(--ease-spring), box-shadow 0.15s, background 0.15s;
}
.logout-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 #1f1f1f;
  background: #d9382b;
}
.logout-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 0 0 0 #1f1f1f;
}

/* ---------- 弹层 ---------- */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 14, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}
.composer {
  width: min(440px, 100%);
  background: var(--card);
  border: var(--line);
  border-radius: 18px;
  box-shadow: var(--shadow-2);
  padding: 22px 24px;
  max-height: 88vh;
  overflow-y: auto;
}
.dlg-title {
  margin: 0 0 16px;
  font-size: 17px;
  font-weight: 800;
  color: var(--ink);
}
.field-label {
  display: block;
  font-size: 12.5px;
  font-weight: 800;
  color: var(--ink-55);
  margin: 14px 0 7px;
}
.field-label:first-of-type {
  margin-top: 0;
}
.text-input {
  width: 100%;
  box-sizing: border-box;
  border: 2px solid var(--ink);
  border-radius: 12px;
  background: var(--card);
  color: var(--ink);
  padding: 11px 14px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
}
.text-input::placeholder {
  color: var(--ink-35);
}
.text-input:focus {
  border-color: var(--c-blue);
}

/* 头像网格 */
.avatar-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 2px;
}
.avatar-pick {
  position: relative;
  border: 2px dashed var(--ink-25);
  border-radius: 14px;
  background: transparent;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s var(--ease-spring), border-color 0.15s, background 0.15s;
}
.avatar-pick:hover {
  transform: translateY(-2px);
  border-color: var(--ink);
  background: var(--hover-bg);
}
.avatar-pick.active {
  border-style: solid;
  border-color: var(--c-blue);
  background: var(--c-blue-soft);
  box-shadow: 2px 2px 0 var(--ink);
}
.pick-tick {
  position: absolute;
  top: 3px;
  right: 5px;
  font-size: 12px;
  font-weight: 900;
  color: var(--c-blue);
}

.dlg-error {
  margin: 10px 0 0;
  font-size: 12.5px;
  color: var(--c-red);
  font-weight: 700;
}
.dlg-foot {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
.outline-btn,
.yellow-btn {
  border-radius: 22px;
  padding: 9px 28px;
  font-size: 14px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
}
.outline-btn {
  border: 2px solid var(--ink);
  background: var(--card);
  color: var(--ink);
}
.outline-btn:hover {
  background: var(--hover-bg);
}
.yellow-btn {
  border: 2px solid #1f1f1f;
  background: var(--c-yellow);
  color: #1f1f1f;
  box-shadow: 3px 3px 0 #1f1f1f;
  transition: transform 0.14s var(--ease-spring), box-shadow 0.14s;
}
.yellow-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #1f1f1f;
}
.yellow-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 0 0 0 #1f1f1f;
}
.yellow-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ---------- 退出登录确认弹层 ---------- */
.logout-composer {
  width: min(360px, 100%);
  padding: 28px 24px 22px;
  text-align: center;
  border-radius: 22px;
  animation: pop-in 0.28s var(--ease-spring);
}
@keyframes pop-in {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
.logout-ico {
  width: 52px;
  height: 52px;
  margin: 0 auto 12px;
  border-radius: 16px;
  border: 2px solid #1f1f1f;
  background: var(--c-red-soft);
  color: var(--c-red);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 2px 2px 0 #1f1f1f;
}
.logout-title {
  margin: 0 0 6px;
  font-size: 17px;
  font-weight: 800;
  color: var(--ink);
}
.logout-msg {
  margin: 0 0 20px;
  font-size: 13.5px;
  color: var(--ink-55);
}
.logout-foot {
  margin-top: 0;
}
.logout-foot .outline-btn,
.logout-foot .red-btn {
  flex: 1;
}
.red-btn {
  border: 2px solid #1f1f1f;
  background: var(--c-red);
  color: #fff;
  box-shadow: 3px 3px 0 #1f1f1f;
  transition: transform 0.14s var(--ease-spring), box-shadow 0.14s, background 0.15s;
}
.red-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #1f1f1f;
  background: #d9382b;
}
.red-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 0 0 0 #1f1f1f;
}

/* ---------- 响应式 ---------- */
@media (max-width: 760px) {
  .user-card {
    flex-wrap: wrap;
  }
  .edit-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
