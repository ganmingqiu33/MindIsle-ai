<template>
  <el-dialog
    :model-value="modelValue"
    :title="editData?.id ? '编辑文章' : '新增文章'"
    width="760px"
    destroy-on-close
    @update:model-value="(v) => emit('update:modelValue', v)"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="92px"
      class="article-form"
    >
      <el-form-item label="文章标题" prop="title">
        <el-input
          v-model="form.title"
          placeholder="请输入文章标题"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="所属分类" prop="categoryId">
        <el-tree-select
          v-model="form.categoryId"
          :data="categories"
          :props="treeProps"
          placeholder="请选择分类"
          clearable
          check-strictly
          :render-after-expand="false"
          class="full-width"
        />
      </el-form-item>

      <el-form-item label="文章摘要" prop="summary">
        <el-input
          v-model="form.summary"
          type="textarea"
          :rows="3"
          placeholder="请输入文章摘要（可选）"
          maxlength="1000"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="标签" prop="tags">
        <el-select
          v-model="form.tags"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="请输入或选择标签"
          class="full-width"
        >
          <el-option label="焦虑" value="焦虑" />
          <el-option label="压力" value="压力" />
          <el-option label="睡眠" value="睡眠" />
          <el-option label="人际" value="人际" />
        </el-select>
      </el-form-item>

      <!-- 封面图片：选文件后自动上传，成功后存 URL -->
      <el-form-item label="封面图片">
        <el-upload
          v-model:file-list="fileList"
          :http-request="customUpload"
          list-type="picture-card"
          :auto-upload="true"
          :limit="1"
          accept="image/*"
          :on-success="handleUploadSuccess"
          :on-error="handleUploadError"
          :on-remove="handleRemove"
          :on-exceed="handleExceed"
        >
          <el-icon><Plus /></el-icon>
        </el-upload>
      </el-form-item>

      <el-form-item label="文章内容" prop="content">
        <div class="editor-wrapper">
          <Toolbar
            class="editor-toolbar"
            :editor="editorRef"
            :default-config="toolbarConfig"
            mode="default"
          />
          <Editor
            v-model="form.content"
            class="editor-content"
            :default-config="editorConfig"
            mode="default"
            @on-created="handleCreated"
          />
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleConfirm">
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, shallowRef, watch, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import { uploadFile } from '@/api/admin'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  categories: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  editData: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const treeProps = { label: 'name', value: 'id', children: 'children' }

const formRef = ref()
const fileList = ref([])

const getDefaultForm = () => ({
  title: '',
  categoryId: '',
  summary: '',
  tags: [],
  cover: '',
  content: '',
})

const form = reactive(getDefaultForm())

const stripHtml = (html) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim()

const rules = {
  title: [{ required: true, message: '请输入文章标题', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  content: [
    {
      required: true,
      validator: (_rule, value, callback) => {
        if (!value || stripHtml(value) === '') {
          callback(new Error('请输入文章内容'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

// ---------- wangEditor ----------
const editorRef = shallowRef()
const toolbarConfig = {}
const editorConfig = {
  placeholder: '请输入文章内容，支持富文本格式\n可以使用加粗、斜体、列表、标题等格式来丰富文章内容。',
}
const handleCreated = (editor) => {
  editorRef.value = editor
  if (props.editData?.content) {
    editor.setHtml(props.editData.content)
  }
}
onBeforeUnmount(() => {
  editorRef.value?.destroy()
})

// ---------- 封面上传 ----------
// 自定义上传：直接调我们封装的 uploadFile（带 token 拦截器）
const customUpload = async ({ file, onSuccess, onError }) => {
  try {
    const url = await uploadFile(file)
    onSuccess(url)
  } catch (e) {
    onError(e)
  }
}

// 上传成功：把后端返回的 URL 存到 form.cover
const handleUploadSuccess = (response, uploadFile) => {
  // response 就是 uploadFile 返回的 data（已经被拦截器解包）
  form.cover = response
  // picture-card 预览也需要 url，el-upload 内部会自己处理
  // 这里不用手动设 uploadFile.url，Element Plus 会根据 response 类型自动处理
}

const handleUploadError = () => {
  ElMessage.error('封面上传失败，请重试')
}

const handleRemove = () => {
  form.cover = ''
}

const handleExceed = () => {
  ElMessage.warning('只能上传 1 张封面，请先删除已有图片')
}

// ---------- 弹窗打开 / 编辑数据回来 ----------
// 弹窗打开瞬间做初始化（从关闭变成打开时触发一次）
watch(
  () => props.modelValue,
  (visible, wasVisible) => {
    if (!visible || wasVisible) return  // 只关心 false → true
    if (props.editData?.id) {
      // 编辑：合并数据
      Object.assign(form, { ...getDefaultForm(), ...props.editData })
      fileList.value = props.editData.cover
        ? [{ name: 'cover', url: props.editData.cover }]
        : []
      if (editorRef.value && props.editData.content) {
        editorRef.value.setHtml(props.editData.content)
      }
    } else {
      // 新增：重置
      Object.assign(form, getDefaultForm())
      fileList.value = []
    }
    formRef.value?.clearValidate()
  }
)

// 编辑模式下，详情接口回来后 editData 变化时，补一次回显（但不清掉用户已填内容）
watch(
  () => props.editData,
  (editData) => {
    if (!props.modelValue || !editData?.id) return
    // form 里如果还是空的，就用 editData 补
    if (!form.title && editData.title) form.title = editData.title
    if (!form.categoryId && editData.categoryId) form.categoryId = editData.categoryId
    if (!form.summary && editData.summary) form.summary = editData.summary
    if ((!form.tags || form.tags.length === 0) && editData.tags) form.tags = [...editData.tags]
    if (!form.cover && editData.cover) {
      form.cover = editData.cover
      fileList.value = [{ name: 'cover', url: editData.cover }]
    }
    if (!form.content && editData.content && editorRef.value) {
      form.content = editData.content
      editorRef.value.setHtml(editData.content)
    }
  }
)

const handleConfirm = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
    emit('submit', {
      ...form,
      id: props.editData?.id,
      tags: [...form.tags],
    })
  } catch {
    // 校验没通过
  }
}

const handleClose = () => {
  formRef.value?.resetFields()
  fileList.value = []
}
</script>

<style scoped>
.full-width {
  width: 100%;
}

.editor-wrapper {
  width: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.editor-toolbar {
  border-bottom: 1px solid #dcdfe6;
}

.editor-content {
  height: 300px;
  overflow-y: hidden;
}
</style>
