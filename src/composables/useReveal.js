import { ref, onMounted, onBeforeUnmount } from 'vue'

// 滚动入场：把返回的 root 绑到页面容器，挂载后自动让容器内
// 带 .reveal 的元素滚入视口时加上 .is-visible（错峰 60ms）。
// 系统开启「减少动态效果」时直接全部可见。
export function useReveal() {
  const root = ref(null)
  let observer = null

  onMounted(() => {
    if (!root.value) return
    const els = root.value.querySelectorAll('.reveal')

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('is-visible'))
      return
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08 }
    )
    els.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i, 8) * 60}ms`
      observer.observe(el)
    })
  })

  onBeforeUnmount(() => observer?.disconnect())

  return { root }
}
