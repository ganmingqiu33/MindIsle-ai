<template>
  <button
    class="kit-btn"
    :class="[pill ? 'is-pill' : 'is-round', `is-${variant}`, color ? `c-${color}` : 'c-yellow']"
    :type="type"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup>
// 卡通按钮：药丸/圆角两种外形，solid 用模块色填充，outline 白底墨线
defineProps({
  variant: { type: String, default: 'outline' }, // solid | outline
  pill: { type: Boolean, default: true },
  color: { type: String, default: 'yellow' }, // blue | yellow | red | green
  type: { type: String, default: 'button' },
})
defineEmits(['click'])
</script>

<style scoped>
.kit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 18px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  color: var(--ink);
  background: var(--card);
  border: var(--line);
  box-shadow: 2px 2px 0 var(--ink);
  cursor: pointer;
  white-space: nowrap;
  transition:
    transform 0.15s var(--ease-spring),
    box-shadow 0.15s var(--ease-smooth),
    background-color 0.2s ease;
}
.kit-btn.is-pill {
  border-radius: var(--radius-pill);
}
.kit-btn.is-round {
  border-radius: 14px;
}
.kit-btn.is-solid.c-blue { background: var(--c-blue); color: #fff; }
/* 黄底始终配深色字（夜间模式下 --ink 变浅会导致黄底白字看不清） */
.kit-btn.is-solid.c-yellow { background: var(--c-yellow); color: #1f1f1f; }
.kit-btn.is-solid.c-red { background: var(--c-red); color: #fff; }
.kit-btn.is-solid.c-green { background: var(--c-green); color: #fff; }

@media (prefers-reduced-motion: no-preference) {
  .kit-btn:hover {
    transform: translate(-1px, -1px);
    box-shadow: 3px 3px 0 var(--ink);
  }
  .kit-btn:active {
    transform: translate(2px, 2px);
    box-shadow: 0 0 0 var(--ink);
  }
}
</style>
