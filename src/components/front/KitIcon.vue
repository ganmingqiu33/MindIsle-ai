<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- 仪表盘：田字格 -->
    <template v-if="name === 'dashboard'">
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </template>
    <!-- 时间计划：日历 + 勾 -->
    <template v-else-if="name === 'plans'">
      <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
      <path d="M9 14.6l2 2 4-4.2" />
    </template>
    <!-- 收支：钱包 -->
    <template v-else-if="name === 'bills'">
      <rect x="3" y="6" width="18" height="14" rx="3" />
      <path d="M3 10.2h18" />
      <circle cx="16.7" cy="14.2" r="1.25" fill="currentColor" stroke="none" />
    </template>
    <!-- 心情日记：心 -->
    <template v-else-if="name === 'diary'">
      <path d="M12 19.5s-7.2-4.7-7.2-9.4A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7.2 3.1c0 4.7-7.2 9.4-7.2 9.4z" />
    </template>
    <!-- 专注：秒表 -->
    <template v-else-if="name === 'focus'">
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 9.5v4l2.6 2.4M9.5 2.8h5M12 2.8v3" />
    </template>
    <!-- 数据总结：柱状图 -->
    <template v-else-if="name === 'stats'">
      <path d="M3.5 20.5h17" />
      <rect x="6.5" y="13" width="3" height="5" />
      <rect x="11.5" y="9" width="3" height="9" />
      <rect x="16.5" y="5.5" width="3" height="12.5" />
    </template>
    <!-- AI：对话气泡 + 星光 -->
    <template v-else-if="name === 'ai'">
      <path d="M4 5.5h16v10.5H9.5L5 19.5v-3.5H4z" />
      <path d="M12 8.2l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" fill="currentColor" stroke="none" />
    </template>
    <!-- 消息中心：信封 -->
    <template v-else-if="name === 'mail'">
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3.5 7.5l8.5 6 8.5-6" />
    </template>
    <!-- 兜底：仪表盘 -->
    <template v-else>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </template>
  </svg>
</template>

<script setup>
defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 22 },
})
</script>
