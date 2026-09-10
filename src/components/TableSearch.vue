<template>
  <div class="table-search">
    <div v-if="$slots.title" class="table-search-title">
      <slot name="title" />
    </div>
    <el-form :model="formData" inline @submit.prevent>
      <template v-for="item in formItem" :key="item.prop">
        <el-form-item :label="item.label" :prop="item.prop">
          <el-select
            v-if="item.component === 'el-select'"
            v-model="formData[item.prop]"
            :placeholder="item.placeholder"
            clearable
            class="search-control"
          >
            <el-option
              v-for="opt in item.options"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <el-input
            v-else
            v-model="formData[item.prop]"
            :placeholder="item.placeholder"
            clearable
            class="search-control"
          />
        </el-form-item>
      </template>
      <el-form-item>
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

const props = defineProps({
  formItem: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['search', 'reset'])

const formData = reactive({})

const initFormData = () => {
  props.formItem.forEach((item) => {
    formData[item.prop] = item.value ?? ''
  })
}
initFormData()

const handleSearch = () => {
  emit('search', { ...formData })
}

const handleReset = () => {
  props.formItem.forEach((item) => {
    formData[item.prop] = ''
  })
  emit('reset')
}
</script>

<style scoped>
.table-search {
  margin-bottom: 16px;
}

.table-search-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.search-control {
  width: 220px;
}
</style>
