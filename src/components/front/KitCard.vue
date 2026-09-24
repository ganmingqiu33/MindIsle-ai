<template>
  <!-- 卡通卡片：2px 墨线描边 + 无模糊硬投影 + 悬停回弹 -->
  <section class="kit-card">
    <slot />
  </section>
</template>

<style scoped>
.kit-card {
  background: var(--card);
  border: var(--line);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-1);
  transition:
    transform 0.18s var(--ease-smooth),
    box-shadow 0.18s var(--ease-smooth);
}

@media (prefers-reduced-motion: no-preference) {
  .kit-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-2);
  }
  .kit-card:active {
    transform: scale(0.99);
  }
}
</style>
