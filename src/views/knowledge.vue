<template>
  <div>
    <PageHead>
      <template #title>知识文章列表</template>
      <template #buttons>
        <el-button type="primary" size="small">新增</el-button>
      </template>
    </PageHead>
    <TableSearch :formItem="formItem" @search="handleSearch" @reset="handleReset">
      <template #title>搜索知识文章</template>
    </TableSearch>
  </div>
</template>

<script setup>
const formItem = [
  {
    label: '文章标题',
    prop: 'title',
    component: 'el-input',
    placeholder: '请输入知识文章标题',
  },
  {
    label: '文章分类',
    prop: 'category',
    component: 'el-select',
    placeholder: '请选择文章分类',
    options: [
      { label: '心理健康基础', value: '1' },
      { label: '情绪管理', value: '2' },
    ],
  },
]

const handleSearch = (formData) => {
  console.log('搜索条件：', formData)
}

const handleReset = () => {
  console.log('已重置搜索条件')
}
</script>
