<template>
  <div ref="rootRef" class="ph-page">
    <KitCard class="ph-card reveal">
      <!-- 角落几何装饰（纯装饰，aria-hidden） -->
      <span class="shape circle" :class="`c-${color}`" aria-hidden="true"></span>
      <span class="shape triangle" aria-hidden="true"></span>
      <span class="shape square" :class="`c-${color}`" aria-hidden="true"></span>

      <div class="ph-icon" :class="`c-${color}`">
        <KitIcon :name="icon" :size="34" />
      </div>
      <span class="ph-pill">{{ phase }} 期上线</span>
      <h2 class="ph-title">{{ title }}</h2>
      <p class="ph-desc">{{ desc }}</p>
    </KitCard>
  </div>
</template>

<script setup>
import KitCard from './KitCard.vue'
import KitIcon from './KitIcon.vue'
import { useReveal } from '@/composables/useReveal'

defineProps({
  icon: { type: String, required: true },
  title: { type: String, required: true },
  phase: { type: String, required: true },
  desc: { type: String, default: '' },
  color: { type: String, default: 'blue' },
})

const { root: rootRef } = useReveal()
</script>

<style scoped>
.ph-page {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background: var(--paper);
}
.ph-card {
  position: relative;
  width: min(520px, 100%);
  padding: 56px 40px;
  text-align: center;
  overflow: hidden;
}
.ph-icon {
  width: 76px;
  height: 76px;
  margin: 0 auto 18px;
  border: var(--line);
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  box-shadow: 3px 3px 0 var(--ink);
}
.ph-icon.c-blue { background: var(--c-blue-soft); }
.ph-icon.c-yellow { background: var(--c-yellow-soft); }
.ph-icon.c-red { background: var(--c-red-soft); }
.ph-icon.c-green { background: var(--c-green-soft); }

.ph-pill {
  display: inline-block;
  padding: 4px 14px;
  font-size: 12px;
  font-weight: 700;
  border-radius: var(--radius-pill);
  background: var(--c-yellow);
  border: 2px solid var(--ink);
}
.ph-title {
  margin: 14px 0 8px;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.ph-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: #6b6b6b;
}

/* 装饰形状 */
.shape {
  position: absolute;
  display: block;
  border: 2px solid var(--ink);
  opacity: 0.9;
}
.circle {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  top: -14px;
right: 36px;
  transform: rotate(12deg);
}
.circle.c-blue { background: var(--c-blue); }
.circle.c-yellow { background: var(--c-yellow); }
.circle.c-red { background: var(--c-red); }
.circle.c-green { background: var(--c-green); }
.triangle {
  width: 0;
  height: 0;
  border: none;
  border-left: 20px solid transparent;
  border-right: 20px solid transparent;
  border-bottom: 32px solid var(--c-yellow);
  filter: drop-shadow(0 0 0 #1f1f1f);
  bottom: 26px;
  left: -8px;
  transform: rotate(-14deg);
}
.square {
  width: 30px;
  height: 30px;
  bottom: -10px;
  right: 48px;
  transform: rotate(16deg);
}
.square.c-blue { background: var(--c-blue); }
.square.c-yellow { background: var(--c-yellow); }
.square.c-red { background: var(--c-red); }
.square.c-green { background: var(--c-green); }
</style>
