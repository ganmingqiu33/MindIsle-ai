<template>
  <div>
    <PageHead>
      <template #title>知识文章列表</template>
      <template #buttons>
        <el-button type="primary" size="small" @click="openAdd">
          新增
        </el-button>
      </template>
    </PageHead>

    <TableSearch :formItem="formItem" @search="handleSearch" @reset="handleReset">
      <template #title>搜索知识文章</template>
    </TableSearch>

    <!-- 文章列表 -->
    <el-table v-loading="listLoading" :data="pagedList" border stripe height="400">
      <el-table-column label="#" width="60" align="center">
        <template #default="{ $index }">
          {{ (query.pageNum - 1) * query.pageSize + $index + 1 }}
        </template>
      </el-table-column>
      <el-table-column prop="title" label="文章标题" min-width="200" show-overflow-tooltip />
      <el-table-column prop="categoryName" label="所属分类" width="140" />
      <el-table-column label="标签" width="180">
        <template #default="{ row }">
          <div class="tag-cell">
            <el-tag
              v-for="(tag, idx) in row.tags || []"
              :key="row.id + '-' + idx"
              size="small"
              class="tag-item"
            >
              {{ tag }}
            </el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="summary" label="摘要" min-width="220" show-overflow-tooltip />
      <el-table-column prop="createTime" label="创建时间" width="170" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="query.pageNum"
        :page-size="10"
        :total="total"
        layout="prev, pager, next"
      />
    </div>

    <!-- 文章弹窗（新增 / 编辑 复用） -->
    <ArticleEditDialog
      v-model="dialogVisible"
      :categories="categories"
      :loading="submitLoading"
      :edit-data="editRow"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHead from '@/components/PageHead.vue'
import TableSearch from '@/components/TableSearch.vue'
import ArticleEditDialog from '@/components/ArticleEditDialog.vue'
import { categoryTree, getArticleList, addArticle, updateArticle, deleteArticle, getArticleDetail } from '@/api/admin'

// ---------- 分类（页面一打开就请求 Apifox） ----------
const categories = ref([])

const loadCategories = async () => {
  try {
    const data = await categoryTree()
    categories.value = data || []
  } catch (e) {
    console.error('分类加载失败：', e)
  }
}

// 搜索表单项：分类选项 = 接口返回的树
const formItem = computed(() => [
  {
    label: '文章标题',
    prop: 'title',
    component: 'el-input',
    placeholder: '请输入知识文章标题',
  },
  {
    label: '文章分类',
    prop: 'categoryId',
    component: 'el-tree-select',
    placeholder: '请选择文章分类',
    options: categories.value,
  },
])

// ---------- 文章列表（客户端分页） ----------
// Mock 阶段：Apifox 一次返回全部数据，前端做切分
// 换真实后端时：把 loadArticles 改回服务端分页（传 pageNum/pageSize 给后端，后端返回当前页数据）
const allArticles = ref([])    // 全量数据（从接口拿回来存在这）
const total = ref(0)           // 总条数
const listLoading = ref(false)
const query = reactive({
  pageNum: 1,
  pageSize: 10,
  title: '',
  categoryId: '',
})

// 按搜索条件过滤后的数据
const filteredArticles = computed(() => {
  return allArticles.value.filter((item) => {
    const matchTitle = !query.title || item.title?.includes(query.title)
    const matchCategory = !query.categoryId || item.categoryId == query.categoryId
    return matchTitle && matchCategory
  })
})

// 当前页要显示的数据：从过滤结果里按 pageSize 切一段出来
const pagedList = computed(() => {
  const start = (query.pageNum - 1) * query.pageSize
  const end = start + Number(query.pageSize)
  return filteredArticles.value.slice(start, end)
})

const loadArticles = async () => {
  listLoading.value = true
  try {
    const data = await getArticleList(query)
    allArticles.value = data?.list || data || []
    total.value = allArticles.value.length
  } catch (e) {
    console.error('文章列表加载失败：', e)
  } finally {
    listLoading.value = false
  }
}

const handleSearch = (formData) => {
  query.title = formData.title || ''
  query.categoryId = formData.categoryId || ''
  query.pageNum = 1   // 搜索后回到第 1 页
  // 不需要重新请求接口——客户端过滤即可
  total.value = filteredArticles.value.length
}

const handleReset = () => {
  query.title = ''
  query.categoryId = ''
  query.pageNum = 1
  total.value = filteredArticles.value.length
}



// ---------- 新增 / 编辑 / 删除 ----------
const dialogVisible = ref(false)
const editRow = ref(null)      // 编辑时存整行数据，新增时 null
const submitLoading = ref(false)

// 根据 categoryId 在分类树里找到 categoryName（Apifox Mock 不返回，前端自己补）
const findCategoryName = (tree, targetId) => {
  for (const node of tree || []) {
    if (node.id == targetId) return node.name
    if (node.children?.length) {
      const found = findCategoryName(node.children, targetId)
      if (found) return found
    }
  }
  return ''
}

// 打开新增弹窗
const openAdd = () => {
  editRow.value = null
  dialogVisible.value = true
}

// 打开编辑弹窗（先拉详情，确保有完整 content/cover）
const handleEdit = async (row) => {
  editRow.value = row  // 先用列表数据打开弹窗（避免白屏）
  dialogVisible.value = true
  try {
    const detail = await getArticleDetail(row.id)
    // 用详情数据覆盖（detail 里有完整的 content / cover）
    editRow.value = { ...row, ...detail }
  } catch (e) {
    console.warn('详情加载失败，使用列表数据回显', e)
  }
}

// 确认删除
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除文章「${row.title}」吗？此操作不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        await deleteArticle(row.id)
        ElMessage.success('删除成功')
        // Mock 阶段：直接从列表移除，不重新请求
        const idx = allArticles.value.findIndex((item) => item.id === row.id)
        if (idx > -1) {
          allArticles.value.splice(idx, 1)
          total.value = allArticles.value.length
        }
      } catch {
        // deleteArticle 失败会被拦截器提示
      }
    })
    .catch(() => {})
}

// 统一处理新增/编辑提交
const handleSubmit = async (form) => {
  submitLoading.value = true
  try {
    if (form.id) {
      // 编辑
      await updateArticle(form.id, form)
      ElMessage.success('文章更新成功')
      dialogVisible.value = false

      // Mock 阶段：直接替换本地列表中的那条
      const idx = allArticles.value.findIndex((item) => item.id === form.id)
      if (idx > -1) {
        const categoryName = findCategoryName(categories.value, form.categoryId)
        allArticles.value[idx] = {
          ...allArticles.value[idx],  // 保留 createTime 等字段
          title: form.title,
          categoryId: form.categoryId,
          categoryName,
          tags: form.tags,
          summary: form.summary,
          cover: form.cover,
          content: form.content,
        }
      }
    } else {
      // 新增
      await addArticle(form)
      ElMessage.success('文章新增成功')
      dialogVisible.value = false

      // Mock 阶段：直接插到列表最前面
      const now = new Date()
      const pad = (n) => n.toString().padStart(2, '0')
      const createTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

      const categoryName = findCategoryName(categories.value, form.categoryId)
      allArticles.value.unshift({
        id: Date.now(),
        title: form.title,
        categoryId: form.categoryId,
        categoryName,
        tags: form.tags,
        summary: form.summary || '',
        cover: form.cover || '',
        content: form.content,
        createTime,
      })
      total.value = allArticles.value.length
      query.pageNum = 1
    }
  } catch (e) {
    console.error('提交失败：', e)
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => {
  loadCategories()
  loadArticles()
})
</script>

<style scoped>
.tag-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  height: 28px;
  overflow: hidden;
}

.tag-item {
  flex-shrink: 0;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
