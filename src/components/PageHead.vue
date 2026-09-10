<template>
  <div class="page-head">
    <p class="page-title">
      <slot name="title">页面标题</slot>
    </p>
    <div class="action-bin">
      <slot name="buttons" />
    </div>
  </div>
</template>
<script setup>
const props = defineProps({
  title: {
    type: String,
    default: '页面标题',
  },
})
</script>
<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
</style>
