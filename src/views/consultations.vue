<template>
  <div>
    <PageHead>
      <template #title>咨询记录</template>
    </PageHead>

    <TableSearch :form-item="formItem" @search="handleSearch" @reset="handleReset">
      <template #title>搜索咨询记录</template>
    </TableSearch>

    <!-- 咨询列表 -->
    <el-table v-loading="listLoading" :data="pagedList" border stripe height="480">
      <el-table-column label="会话ID" width="260">
        <template #default="{ row }">
          <div class="session-cell">
            <el-avatar
              :size="38"
              :style="{ background: avatarColors[row.id % avatarColors.length] }"
            >
              {{ (row.user?.nickname || row.user?.username || '?')[0]?.toUpperCase() }}
            </el-avatar>
            <div class="session-info">
              <div class="session-name">{{ row.user?.nickname || row.user?.username || '未知用户' }}</div>
              <div class="session-sub">
                {{ row.aiName || '心屿AI' }} - {{ row.createTime }}
              </div>
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="情绪标签" width="160">
        <template #default="{ row }">
          <div v-if="row.emotionTags?.length" class="emotion-tags">
            <el-tag
              v-for="(tag, idx) in row.emotionTags"
              :key="idx"
              size="small"
              :type="emotionColor(tag)"
              class="emotion-tag"
            >
              {{ tag }}
            </el-tag>
          </div>
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>

      <el-table-column prop="messageCount" label="消息数" width="90" align="center" />

      <el-table-column label="时间" width="150">
        <template #default="{ row }">
          <div class="time-cell">
            <div class="time-date">{{ row.createTime?.split(' ')[0] }}</div>
            <div class="time-clock">{{ row.createTime?.split(' ')[1] }}</div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="handleDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="query.pageNum"
        :page-size="query.pageSize"
        :total="total"
        layout="prev, pager, next"
      />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="咨询详情"
      width="680px"
      destroy-on-close
    >
      <div v-if="detailRow" class="detail-wrap">
        <div class="detail-meta">
          <span>用户：{{ detailRow.user?.nickname || detailRow.user?.username }}</span>
          <span>消息数：{{ detailRow.messageCount }}</span>
          <span>时间：{{ detailRow.createTime }}</span>
        </div>
        <div class="chat-list">
          <div
            v-for="(msg, idx) in detailRow.messages || []"
            :key="idx"
            :class="['chat-item', msg.role]"
          >
            <el-avatar
              :size="32"
              :style="{
                background: msg.role === 'user'
                  ? avatarColors[detailRow.id % avatarColors.length]
                  : '#409eff'
              }"
            >
              {{ msg.role === 'user' ? 'U' : 'AI' }}
            </el-avatar>
            <div class="chat-bubble">{{ msg.content }}</div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import PageHead from '@/components/PageHead.vue'
import TableSearch from '@/components/TableSearch.vue'
import { getConsultationList, getConsultationDetail } from '@/api/admin'

// ---------- 头像颜色池 ----------
const avatarColors = ['#f56c6c', '#e6a23c', '#67c23a', '#409eff', '#909399', '#b37feb', '#36cfc9']

// ---------- 情绪标签颜色 ----------
const emotionColor = (tag) => {
  const t = String(tag)
  if (/焦虑|紧张|恐惧|害怕/.test(t)) return 'danger'
  if (/抑郁|低落|失落|难过|伤心/.test(t)) return 'info'
  if (/开心|愉快|满足|积极|感谢/.test(t)) return 'success'
  return 'warning'
}

// ---------- 搜索条件 ----------
const query = reactive({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
})

const formItem = computed(() => [
  {
    label: '用户昵称',
    prop: 'keyword',
    component: 'el-input',
    placeholder: '请输入用户昵称',
  },
])

// ---------- 列表（Apifox 接口还没配对时，用本地 Mock 数据兜底） ----------
const allList = ref([])
const total = ref(0)
const listLoading = ref(false)

const loadList = async () => {
  listLoading.value = true
  try {
    const data = await getConsultationList(query)
    allList.value = data?.list || data || []
    total.value = allList.value.length
  } catch (e) {
    // Apifox 接口不存在 → 用本地 Mock 数据
    console.warn('咨询列表接口暂未配置，使用本地 Mock 数据')
    allList.value = mockConsultations
    total.value = mockConsultations.length
  } finally {
    listLoading.value = false
  }
}

// 按关键词过滤
const filteredList = computed(() => {
  if (!query.keyword) return allList.value
  const kw = query.keyword.toLowerCase()
  return allList.value.filter(
    (i) =>
      (i.user?.nickname || i.user?.username || '').toLowerCase().includes(kw) ||
      (i.emotionTags || []).some((t) => t.includes(query.keyword))
  )
})

const pagedList = computed(() => {
  const start = (query.pageNum - 1) * query.pageSize
  return filteredList.value.slice(start, start + query.pageSize)
})

const handleSearch = (form) => {
  query.keyword = form.keyword || ''
  query.pageNum = 1
  total.value = filteredList.value.length
}

const handleReset = () => {
  query.keyword = ''
  query.pageNum = 1
  total.value = filteredList.value.length
}

// ---------- 详情 ----------
const detailVisible = ref(false)
const detailRow = ref(null)
const detailLoading = ref(false)

const handleDetail = async (row) => {
  detailVisible.value = true
  detailLoading.value = true
  // 先放个占位（避免弹窗空白）
  detailRow.value = { ...row, messages: [] }
  try {
    const data = await getConsultationDetail(row.id)
    // Apifox 返回单条对象：{ id, messages: [...] }
    // 兼容兜底：如果还是数组就 find
    const single = Array.isArray(data)
      ? data.find((i) => i.id === row.id)
      : data
    detailRow.value = single || { ...row, messages: [] }
  } catch {
    detailRow.value = { ...row, messages: [] }
  } finally {
    detailLoading.value = false
  }
}

// ---------- 本地 Mock（Apifox 未配置接口时兜底） ----------
const mockConsultations = [
  {
    id: 1,
    user: { nickname: 'allen', username: 'allen' },
    aiName: '心屿AI',
    emotionTags: ['焦虑', '压力'],
    messageCount: 2,
    createTime: '2026-02-11 11:53:47',
    messages: [
      { role: 'user', content: '哎呀，摔跤受伤了很疼疼 😣 让我先陪着你处理一下伤口好吗？首先要注意：① 先用清水轻轻冲洗伤口 ② 如果有碘伏或酒精可以简单消毒 ③ 贴上创可贴保护伤口 你现在感觉怎么样？' },
      { role: 'assistant', content: '收到！我先帮你记录下来，明天去复诊的时候记得提醒医生看看哈～' },
    ],
  },
  {
    id: 2,
    user: { nickname: 'allen', username: 'allen' },
    aiName: '心屿AI',
    emotionTags: ['开心'],
    messageCount: 4,
    createTime: '2026-02-11 11:53:27',
    messages: [
      { role: 'user', content: '听到这个消息真的为你开心！🎉 中奖就像生活突然派发的小惊喜，让人忍不住嘴角上扬呢～可以和我说说吗？' },
      { role: 'assistant', content: '嗯嗯！是抽中了什么有趣的奖品吗？' },
    ],
  },
  {
    id: 3,
    user: { nickname: 'mira', username: 'mira' },
    aiName: '心屿AI',
    emotionTags: ['低落'],
    messageCount: 6,
    createTime: '2026-02-10 22:15:02',
    messages: [
      { role: 'user', content: '最近总觉得打不起精神，什么都不想做……' },
      { role: 'assistant', content: '我理解这种感觉。能告诉我这种状态持续多久了吗？我们可以一起慢慢梳理。' },
    ],
  },
  {
    id: 4,
    user: { nickname: 'tommy', username: 'tommy' },
    aiName: '心屿AI',
    emotionTags: ['紧张', '人际'],
    messageCount: 3,
    createTime: '2026-02-10 15:42:18',
    messages: [
      { role: 'user', content: '明天要上台做汇报，现在心跳好快……' },
      { role: 'assistant', content: '这是正常的身体反应！试试 4-7-8 呼吸法：吸气 4 秒，屏息 7 秒，呼气 8 秒。做三轮你会感觉好很多。' },
    ],
  },
  {
    id: 5,
    user: { nickname: 'luna', username: 'luna' },
    aiName: '心屿AI',
    emotionTags: [],
    messageCount: 1,
    createTime: '2026-02-09 09:10:30',
    messages: [
      { role: 'user', content: '你好，我最近睡眠不太好，想了解一下改善方法。' },
      { role: 'assistant', content: '好的，睡眠问题有很多可能的原因，我们可以先从作息、环境、饮食几个方面一起看看～' },
    ],
  },
  {
    id: 6,
    user: { nickname: 'kiwi', username: 'kiwi' },
    aiName: '心屿AI',
    emotionTags: ['焦虑', '抑郁'],
    messageCount: 8,
    createTime: '2026-02-08 20:33:11',
    messages: [
      { role: 'user', content: '感觉自己已经连续两周没睡过好觉了' },
      { role: 'assistant', content: '两周确实不短了，这种持续的失眠会让人很疲惫。在这之前有发生什么特别的事情吗？' },
    ],
  },
  {
    id: 7,
    user: { nickname: 'neo', username: 'neo' },
    aiName: '心屿AI',
    emotionTags: ['积极'],
    messageCount: 2,
    createTime: '2026-02-07 18:05:44',
    messages: [
      { role: 'user', content: '谢谢你听我说了这么多，感觉好多了！' },
      { role: 'assistant', content: '能感觉到你的轻松我也很开心～下次需要聊聊随时来，我一直在。💛' },
    ],
  },
]

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.session-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.session-info {
  min-width: 0;
}

.session-name {
  font-weight: 600;
  color: #303133;
  line-height: 1.3;
}

.session-sub {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.emotion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  overflow: hidden;
}

.emotion-tag {
  flex-shrink: 0;
}

.muted {
  color: #c0c4cc;
}

.time-cell {
  line-height: 1.4;
}

.time-date {
  color: #606266;
}

.time-clock {
  font-size: 12px;
  color: #909399;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* ---------- 详情弹窗 ---------- */
.detail-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-meta {
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: #909399;
  padding: 10px 14px;
  background: #f7f8fa;
  border-radius: 6px;
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 4px;
}

.chat-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.chat-item.user {
  flex-direction: row-reverse;
}

.chat-bubble {
  max-width: 72%;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-item.assistant .chat-bubble {
  background: #ecf5ff;
  color: #303133;
  border-top-left-radius: 2px;
}

.chat-item.user .chat-bubble {
  background: #409eff;
  color: #fff;
  border-top-right-radius: 2px;
}
</style>
