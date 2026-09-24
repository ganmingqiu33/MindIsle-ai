// AI 知识库文件管理（模块级单例）
// 上传的文件元数据持久化在 localStorage，文件本身由 Dify /dify/v1/files/upload 托管
// 每条记录：{ id, name, size, ext, uploadFileId, uploadedAt, status }
//   status: 'uploading' | 'ready' | 'error' | 'summarizing' | 'done'

import { ref } from 'vue'
import { difyUploadFile, DifyError } from '@/utils/dify'
import { scopedKey } from '@/utils/storageScope'

const STORAGE_BASE = 'xinyu-knowledge-files'

// 允许的文件扩展名
const ALLOWED_EXT = ['doc', 'docx', 'txt', 'md', 'pdf']
const MAX_SIZE = 15 * 1024 * 1024 // 15MB

const files = ref(load())

function load() {
  try {
    return JSON.parse(localStorage.getItem(scopedKey(STORAGE_BASE))) || []
  } catch {
    return []
  }
}

function persist() {
  try {
    localStorage.setItem(scopedKey(STORAGE_BASE), JSON.stringify(files.value))
  } catch {}
}

// 校验文件类型与大小，返回 { ok, error }
export function validateFile(file) {
  const name = file.name || ''
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_EXT.includes(ext)) {
    return { ok: false, error: `不支持的文件类型 .${ext}，仅支持 ${ALLOWED_EXT.join(' / ')}` }
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, error: `文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），上限 15MB` }
  }
  return { ok: true, ext }
}

// 上传文件到 Dify，写入列表
export async function uploadKnowledgeFile(file) {
  const v = validateFile(file)
  if (!v.ok) throw new Error(v.error)

  // 临时记录，方便 UI 立即看到上传中状态
  const tempId = 'tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
  const record = {
    id: tempId,
    name: file.name,
    size: file.size,
    ext: v.ext,
    uploadFileId: '',
    uploadedAt: Date.now(),
    status: 'uploading',
    error: '',
  }
  files.value.unshift(record)
  persist()

  try {
    const res = await difyUploadFile(file)
    record.uploadFileId = res.id
    record.status = 'ready'
    persist()
    return record
  } catch (err) {
    record.status = 'error'
    record.error = err?.message || '上传失败'
    persist()
    throw err
  }
}

// 删除一条文件记录（仅前端，Dify 侧文件由其自身生命周期管理）
export function removeKnowledgeFile(id) {
  files.value = files.value.filter((f) => f.id !== id)
  persist()
}

// 更新某条记录状态（供 chatStore 在总结时调用）
export function patchKnowledgeFile(id, patch) {
  const f = files.value.find((x) => x.id === id)
  if (!f) return
  Object.assign(f, patch)
  persist()
}

// 标记某文件进入总结中 / 已总结完成
export function markSummarizing(id) {
  patchKnowledgeFile(id, { status: 'summarizing' })
}
export function markSummarized(id) {
  patchKnowledgeFile(id, { status: 'done' })
}
export function markSummaryError(id, msg) {
  patchKnowledgeFile(id, { status: 'ready', error: msg || '总结失败' })
}

// 构造 Dify chat-messages 的 files 参数
export function buildDifyFiles(fileRecord) {
  if (!fileRecord?.uploadFileId) return []
  return [
    {
      type: 'document',
      transfer_method: 'local_file',
      upload_file_id: fileRecord.uploadFileId,
    },
  ]
}

export function useKnowledgeFiles() {
  return {
    files,
    uploadKnowledgeFile,
    removeKnowledgeFile,
    markSummarizing,
    markSummarized,
    markSummaryError,
    buildDifyFiles,
    validateFile,
  }
}
