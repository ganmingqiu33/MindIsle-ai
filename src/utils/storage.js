// ============================================================
// 本地数据层：localStorage 的 JSON 薄封装
// 所有工作台模块统一走这里读写，key 自动补 xinyu: 前缀。
// 未来迁后端时，仅替换本文件内部实现（页面通过各模块 store 间接使用）。
// ============================================================

const PREFIX = 'xinyu:'

// 读取并反序列化；任何异常（不存在/损坏 JSON）都返回 fallback
export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

// 序列化写入
export function save(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value))
}

// 删除一个键
export function remove(key) {
  localStorage.removeItem(PREFIX + key)
}
