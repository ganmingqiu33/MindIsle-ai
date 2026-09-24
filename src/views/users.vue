<template>
  <div class="mail-page">
    <div class="page-head">
      <div>
        <h2 class="page-title">用户与邮件</h2>
        <p class="page-sub">查看注册用户，向单个用户或全体用户发送邮件</p>
      </div>
      <el-button type="primary" :icon="Promotion" @click="openBroadcast">群发邮件</el-button>
    </div>

    <el-table :data="users" v-loading="loading" border stripe style="width: 100%">
      <el-table-column prop="id" label="ID" width="70" align="center" />
      <el-table-column prop="email" label="邮箱" min-width="220" />
      <el-table-column prop="nickname" label="昵称" min-width="140" />
      <el-table-column prop="created_at" label="注册时间" width="180" align="center" />
      <el-table-column label="操作" width="140" align="center" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link :icon="Message" @click="openSingle(row)">发送邮件</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 发邮件弹层（单发 / 群发共用） -->
    <el-dialog
      v-model="mailDlg.open"
      :title="mailDlg.mode === 'single' ? `发送邮件给 ${mailDlg.to}` : '群发邮件给全部用户'"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-form-item label="收件人">
          <el-input v-model="mailDlg.to" :disabled="mailDlg.mode === 'single'" placeholder="群发时自动填充全部用户" />
        </el-form-item>
        <el-form-item label="主题">
          <el-input v-model="mailDlg.subject" placeholder="邮件主题" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="正文">
          <el-input
            v-model="mailDlg.text"
            type="textarea"
            :rows="8"
            placeholder="输入邮件正文内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="mailDlg.open = false">取消</el-button>
        <el-button type="primary" :loading="sending" @click="submitMail">发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Message, Promotion } from '@element-plus/icons-vue'
import { getUserList, sendEmail, broadcastEmail } from '@/api/admin'

const loading = ref(false)
const sending = ref(false)
const users = ref([])

const mailDlg = reactive({
  open: false,
  mode: 'single', // single | broadcast
  to: '',
  subject: '',
  text: '',
})

const loadUsers = async () => {
  loading.value = true
  try {
    const res = await getUserList()
    users.value = res.list || []
  } catch (e) {
    ElMessage.error(e?.msg || '获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const openSingle = (row) => {
  mailDlg.mode = 'single'
  mailDlg.to = row.email
  mailDlg.subject = ''
  mailDlg.text = ''
  mailDlg.open = true
}

const openBroadcast = () => {
  mailDlg.mode = 'broadcast'
  mailDlg.to = `全部用户（共 ${users.value.length} 人）`
  mailDlg.subject = ''
  mailDlg.text = ''
  mailDlg.open = true
}

const submitMail = async () => {
  if (!mailDlg.subject.trim()) return ElMessage.warning('请填写邮件主题')
  if (!mailDlg.text.trim()) return ElMessage.warning('请填写邮件正文')

  sending.value = true
  try {
    if (mailDlg.mode === 'single') {
      await sendEmail({ to: mailDlg.to, subject: mailDlg.subject, text: mailDlg.text })
      ElMessage.success('邮件发送成功')
    } else {
      const res = await broadcastEmail({ subject: mailDlg.subject, text: mailDlg.text })
      ElMessage.success(`群发完成：成功 ${res.success} / 失败 ${res.failed}`)
    }
    mailDlg.open = false
  } catch (e) {
    ElMessage.error(e?.msg || '邮件发送失败')
  } finally {
    sending.value = false
  }
}

onMounted(loadUsers)
</script>

<style scoped>
.mail-page {
  padding: 4px;
}
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1f1f1f;
}
.page-sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: #909399;
}
</style>
