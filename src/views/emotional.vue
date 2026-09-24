<template>
  <div>
    <PageHead>
      <template #title>情绪日志</template>
    </PageHead>

    <TableSearch :form-item="formItem" @search="handleSearch" @reset="handleReset">
      <template #title>搜索情绪日志</template>
    </TableSearch>

    <!-- 日志列表 -->
    <el-table v-loading="listLoading" :data="pagedList" border stripe height="480">
      <el-table-column prop="userId" label="用户ID" width="80" align="center" />

      <el-table-column label="会话ID" width="150">
        <template #default="{ row }">
          <div class="user-cell">
            <el-avatar
              :size="36"
              :style="{ background: avatarColors[row.userId % avatarColors.length] }"
            >
              {{ (row.user?.nickname || row.user?.username || '?')[0]?.toUpperCase() }}
            </el-avatar>
            <span class="user-name">{{ row.user?.nickname || row.user?.username || '-' }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="recordDate" label="记录日期" width="120" />

      <el-table-column label="情绪评分" width="200" align="center">
        <template #default="{ row }">
          <el-rate
            :model-value="row.score"
            disabled
            :max="10"
            :colors="starColors"
          />
        </template>
      </el-table-column>

      <el-table-column label="生活指标" width="140">
        <template #default="{ row }">
          <div class="indicator">
            <div class="indicator-line">
              <span class="indicator-label">睡眠：</span>
              <el-rate
                :model-value="row.indicators?.sleep ?? 0"
                disabled
                :max="5"
                size="small"
                :colors="starColors"
              />
              <span class="indicator-num">{{ row.indicators?.sleep ?? 0 }}/5</span>
            </div>
            <div class="indicator-line">
              <span class="indicator-label">压力：</span>
              <el-rate
                :model-value="row.indicators?.stress ?? 0"
                disabled
                :max="5"
                size="small"
                :colors="stressColors"
              />
              <span class="indicator-num">{{ row.indicators?.stress ?? 0 }}/5</span>
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="trigger" label="情绪触发因素" width="130" show-overflow-tooltip />

      <el-table-column prop="content" label="日记内容" min-width="160" show-overflow-tooltip />

      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="handleDetail(row)">详情</el-button>
          <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
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
    <el-dialog v-model="detailVisible" title="情绪日志详情" width="560px" destroy-on-close>
      <div v-if="detailRow" class="detail-wrap" v-loading="detailLoading">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户ID">
            {{ detailRow.userId }}
          </el-descriptions-item>
          <el-descriptions-item label="用户">
            {{ detailRow.user?.nickname || detailRow.user?.username || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="记录日期" :span="2">
            {{ detailRow.recordDate }}
          </el-descriptions-item>
          <el-descriptions-item label="情绪评分" :span="2">
            <el-rate
              :model-value="detailRow.score"
              disabled
              :max="10"
              show-score
              :colors="starColors"
            />
          </el-descriptions-item>
          <el-descriptions-item label="睡眠质量">
            <el-rate
              :model-value="detailRow.indicators?.sleep ?? 0"
              disabled
              :max="5"
              size="small"
              :colors="starColors"
            />
            {{ detailRow.indicators?.sleep ?? 0 }}/5
          </el-descriptions-item>
          <el-descriptions-item label="压力水平">
            <el-rate
              :model-value="detailRow.indicators?.stress ?? 0"
              disabled
              :max="5"
              size="small"
              :colors="stressColors"
            />
            {{ detailRow.indicators?.stress ?? 0 }}/5
          </el-descriptions-item>
          <el-descriptions-item label="情绪触发因素" :span="2">
            {{ detailRow.trigger || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="日记内容" :span="2">
            <div class="detail-content">{{ detailRow.content || '-' }}</div>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHead from '@/components/PageHead.vue'
import TableSearch from '@/components/TableSearch.vue'
import {
  getEmotionLogList,
  getEmotionLogDetail,
  deleteEmotionLog,
} from '@/api/admin'

// ---------- 颜色 ----------
const avatarColors = ['#f56c6c', '#e6a23c', '#67c23a', '#409eff', '#909399', '#b37feb', '#36cfc9']
const starColors = ['#f7ba2a', '#f7ba2a', '#f7ba2a']
const stressColors = ['#67c23a', '#e6a23c', '#f56c6c'] // 压力越高越红

// ---------- 搜索条件 ----------
const query = reactive({
  pageNum: 1,
  pageSize: 10,
  userId: '',
  scoreRange: '',
})

// 评分范围选项：low=1~3 分，mid=4~6 分，high=7~10 分
const scoreRangeOptions = [
  { label: '低分（1-3 分）', value: 'low' },
  { label: '中分（4-6 分）', value: 'mid' },
  { label: '高分（7-10 分）', value: 'high' },
]

const formItem = computed(() => [
  {
    label: '用户ID',
    prop: 'userId',
    component: 'el-input',
    placeholder: '请输入用户ID',
  },
  {
    label: '情绪评分',
    prop: 'scoreRange',
    component: 'el-select',
    placeholder: '请选择评分范围',
    options: scoreRangeOptions,
  },
])

// ---------- 列表 ----------
const allList = ref([])
const total = ref(0)
const listLoading = ref(false)

const loadList = async () => {
  listLoading.value = true
  try {
    const data = await getEmotionLogList(query)
    allList.value = data?.list || data || []
    total.value = allList.value.length
  } catch (e) {
    // Apifox 接口未配置时用本地 Mock 兜底
    console.warn('情绪日志接口暂未配置，使用本地 Mock 数据')
    allList.value = mockLogs
    total.value = mockLogs.length
  } finally {
    listLoading.value = false
  }
}

// 客户端过滤：用户ID + 评分范围
const filteredList = computed(() => {
  return allList.value.filter((item) => {
    const matchUser = !query.userId || String(item.userId) === String(query.userId)
    let matchScore = true
    if (query.scoreRange === 'low') matchScore = item.score >= 1 && item.score <= 3
    if (query.scoreRange === 'mid') matchScore = item.score >= 4 && item.score <= 6
    if (query.scoreRange === 'high') matchScore = item.score >= 7 && item.score <= 10
    return matchUser && matchScore
  })
})

const pagedList = computed(() => {
  const start = (query.pageNum - 1) * query.pageSize
  return filteredList.value.slice(start, start + query.pageSize)
})

const handleSearch = (form) => {
  query.userId = form.userId || ''
  query.scoreRange = form.scoreRange || ''
  query.pageNum = 1
  total.value = filteredList.value.length
}

const handleReset = () => {
  query.userId = ''
  query.scoreRange = ''
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
  detailRow.value = { ...row }
  try {
    const data = await getEmotionLogDetail(row.id)
    const single = Array.isArray(data) ? data.find((i) => i.id === row.id) : data
    if (single) detailRow.value = single
  } catch {
    // 详情接口没有就用列表行数据
  } finally {
    detailLoading.value = false
  }
}

// ---------- 删除 ----------
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除 ${row.recordDate} 的情绪日志吗？此操作不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        await deleteEmotionLog(row.id)
        ElMessage.success('删除成功')
        // Mock 阶段：本地移除
        const idx = allList.value.findIndex((i) => i.id === row.id)
        if (idx > -1) {
          allList.value.splice(idx, 1)
          total.value = allList.value.length
        }
      } catch {
        // 拦截器已提示
      }
    })
    .catch(() => {})
}

// ---------- 本地 Mock 数据（接口未配置时兜底） ----------
const mockLogs = [
  {
    id: 1,
    userId: 5,
    user: { nickname: 'allen', username: 'allen' },
    sessionId: 'S-20260129-01',
    recordDate: '2026-01-29',
    score: 8,
    indicators: { sleep: 3, stress: 1 },
    trigger: '无事发生',
    content: '风平浪静',
  },
  {
    id: 2,
    userId: 5,
    user: { nickname: 'allen', username: 'allen' },
    sessionId: 'S-20260121-02',
    recordDate: '2026-01-21',
    score: 7,
    indicators: { sleep: 4, stress: 3 },
    trigger: '彩票中奖了',
    content: '开心',
  },
  {
    id: 3,
    userId: 5,
    user: { nickname: 'allen', username: 'allen' },
    sessionId: 'S-20260115-03',
    recordDate: '2026-01-15',
    score: 3,
    indicators: { sleep: 2, stress: 5 },
    trigger: '工作汇报被批评',
    content: '今天很难过，觉得自己什么都做不好，晚上翻来覆去睡不着。',
  },
  {
    id: 4,
    userId: 8,
    user: { nickname: 'mira', username: 'mira' },
    sessionId: 'S-20260118-04',
    recordDate: '2026-01-18',
    score: 5,
    indicators: { sleep: 3, stress: 3 },
    trigger: '和朋友吵架',
    content: '心情一般，有点堵得慌，但说出来之后好多了。',
  },
  {
    id: 5,
    userId: 8,
    user: { nickname: 'mira', username: 'mira' },
    sessionId: 'S-20260110-05',
    recordDate: '2026-01-10',
    score: 6,
    indicators: { sleep: 4, stress: 2 },
    trigger: '周末郊游',
    content: '出去走了走，晒了太阳，整个人轻松了不少。',
  },
  {
    id: 6,
    userId: 12,
    user: { nickname: 'tommy', username: 'tommy' },
    sessionId: 'S-20260105-06',
    recordDate: '2026-01-05',
    score: 2,
    indicators: { sleep: 1, stress: 5 },
    trigger: '考试压力',
    content: '马上要期末考了，完全复习不进去，焦虑到胃疼。',
  },
  {
    id: 7,
    userId: 12,
    user: { nickname: 'tommy', username: 'tommy' },
    sessionId: 'S-20260102-07',
    recordDate: '2026-01-02',
    score: 9,
    indicators: { sleep: 5, stress: 1 },
    trigger: '新年家庭聚餐',
    content: '跨年夜和家人在一起，很温暖，希望新的一年大家都健康。',
  },
]

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-name {
  font-size: 14px;
  color: #303133;
}

.indicator {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
}

.indicator-line {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #606266;
}

.indicator-label {
  width: 42px;
  flex-shrink: 0;
}

.indicator-num {
  color: #909399;
  margin-left: 2px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.detail-content {
  white-space: pre-wrap;
  line-height: 1.7;
  color: #303133;
}
</style>
