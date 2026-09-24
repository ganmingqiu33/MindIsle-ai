// 本地存储按账号隔离：同一浏览器的不同账号互不可见
// 登录用户使用 <base>:u<id>，未登录访客使用 <base>:anon
// 登录/退出后页面会整体刷新，各 store 单例按新身份重新装载
export function scopedKey(base) {
  try {
    const u = JSON.parse(localStorage.getItem('frontUser') || 'null')
    if (u?.id != null) return `${base}:u${u.id}`
  } catch {}
  return `${base}:anon`
}
