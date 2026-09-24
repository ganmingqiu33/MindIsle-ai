<script setup>
import { computed } from 'vue'
import { getAvatar } from '@/utils/avatars'

const props = defineProps({
  // 用户选择的头像 id（user.avatar）
  avatarId: { type: [Number, String], default: 1 },
  size: { type: Number, default: 30 },
})

const a = computed(() => getAvatar(props.avatarId))
</script>

<template>
  <span
    class="user-face"
    :style="{
      width: size + 'px',
      height: size + 'px',
      background: a.bg,
      fontSize: Math.round(size * 0.58) + 'px',
    }"
  >{{ a.emoji }}</span>
</template>

<style scoped>
.user-face {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2px solid var(--ink, #1f1f1f);
  line-height: 1;
  flex-shrink: 0;
  box-sizing: border-box;
  user-select: none;
}
</style>
