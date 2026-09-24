# 心屿工作台 P0 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成工作台地基：卡通风格设计令牌、7 个路由与侧栏、数据层薄封装、仪表盘外壳、AI 聊天页迁移（历史会话内收）。

**Architecture:** 纯前端方案。设计令牌挂 `:root`；localStorage 经 `utils/storage.js` 统一读写；UI 组件放 `components/front/`；AI 聊天逻辑（chatStore/dify.js）零改动，只搬迁展示层。

**Tech Stack:** Vue 3.5 `<script setup>`、vue-router 4、Element Plus（仅弹窗/提示用）、ECharts 6、纯 CSS 动效（无新依赖）。

**Spec:** `docs/superpowers/specs/2026-09-14-workbench-p0-foundation-design.md`（执行者必须同时阅读规格与本计划）

## Global Constraints

- 平台：Windows + PowerShell 5；**本机无 git 命令、无单元测试框架**。本计划用「dev server HMR 核对 + `npm run build` + 浏览器回归」替代 TDD 与 commit 步骤；每个 Task 末尾的「核对」即验收门，不通过不许进入下一 Task。
- 不新增任何 npm 依赖。
- 所有新增代码注释用中文。
- 颜色/圆角/阴影/动效**只能**使用本计划 Task 1 定义的 CSS 变量，禁止硬编码色值（黑白灰中性值除外）。
- 不修改：`src/views/front/Landing.vue` 的视觉（仅 Task 5 改一处跳转路径）、`src/views/dashboard.vue` 等 `/back` 全部文件、`src/utils/dify.js`、`src/utils/chatStore.js`、`vite.config.js`。
- 对规格的一处工程化微调（已获方法论允许，DRY）：7 个菜单图标不拆 7 个文件，合并为单个 `KitIcon.vue`（name prop + 路径表），视觉契约不变。
- dev server 已在 5173 端口后台运行，改动经 HMR 即时生效；如页面无响应再重启，勿重复启动。

---

## File Structure

| 文件 | 职责 |
|---|---|
| `src/styles/tokens.css` | 设计令牌（色板/圆角/阴影/动效）+ `.reveal` 入场工具类 + 路由过渡类 |
| `src/utils/storage.js` | localStorage JSON 薄封装：load/save/remove |
| `src/composables/useReveal.js` | IntersectionObserver 入场动效，返回 `root` ref |
| `src/components/front/KitCard.vue` | 卡通卡片（2px 墨线描边 + 硬投影 + 悬停回弹） |
| `src/components/front/KitButton.vue` | 卡通按钮（solid/outline，可选药丸） |
| `src/components/front/KitIcon.vue` | 7 个 2px 线条菜单图标（name: dashboard/plans/bills/diary/focus/stats/ai） |
| `src/components/front/ModulePlaceholder.vue` | 模块占位（图标 + 名称 + 期号 + 几何装饰） |
| `src/views/front/Plans.vue` 等 5 个 | 薄壳页，仅渲染 ModulePlaceholder |
| `src/views/front/AiChat.vue` | 由 Home.vue 迁入；左为历史会话小栏，右为原聊天区，样式保持极简黑白 |
| `src/views/front/Dashboard.vue` | 仪表盘 8 区外壳，空状态 + ECharts 零数据柱图 |
| `src/components/FrontendLayout.vue` | 平铺 7 项菜单、移除历史区块、卡通激活态、路由过渡 |
| `src/router/index.js` | 新路由表、默认首页 dashboard、守卫更新 |
| `src/main.js` | 引入 tokens.css |
| `src/views/front/Login.vue`、`Landing.vue` | 默认跳转改为 `/front/dashboard` |

---

### Task 1: 设计令牌与数据层薄封装

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/utils/storage.js`
- Modify: `src/main.js`（加一行 import）

**Interfaces:**
- Produces: CSS 变量（`--ink --paper --card --c-blue --c-yellow --c-red --c-green` 及 4 个 `-soft`、`--radius-card 24px`、`--line`、`--shadow-1/2`、`--ease-spring/--ease-smooth`）；工具类 `.reveal` / `.is-visible`、过渡类 `.slide-fade-*`
- Produces: `load(key, fallback)`、`save(key, value)`、`remove(key)`，key 自动补 `xinyu:` 前缀

- [ ] **Step 1: 创建 `src/styles/tokens.css`**

```css
/* ============================================================
   心屿工作台设计令牌（Google 卡通线条风）
   仅工作台页面使用；AI 聊天页与落地页不引用这些皮肤变量做皮肤覆盖
   ============================================================ */
:root {
  /* 色板 */
  --ink: #1f1f1f;
  --paper: #f6f5f0;
  --card: #ffffff;
  --c-blue: #1a73e8;
  --c-yellow: #fbbc04;
  --c-red: #ea4335;
  --c-green: #34a853;
  --c-blue-soft: #e8f0fe;
  --c-yellow-soft: #fef7e0;
  --c-red-soft: #fce8e6;
  --c-green-soft: #e6f4ea;

  /* 形状 */
  --line: 2px solid var(--ink);
  --radius-card: 24px;
  --radius-pill: 999px;
  --shadow-1: 4px 4px 0 var(--ink);
  --shadow-2: 6px 6px 0 var(--ink);

  /* 动效 */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth: cubic-bezier(0.22, 1, 0.36, 1);
}

/* ---------- 入场动效工具类（配合 useReveal） ---------- */
.reveal {
  opacity: 0;
  transform: translateY(16px) rotate(-1deg);
  transition:
    opacity 0.5s var(--ease-smooth),
    transform 0.5s var(--ease-spring);
  will-change: opacity, transform;
}
.reveal.is-visible {
  opacity: 1;
  transform: translateY(0) rotate(0);
}

/* ---------- 路由切换过渡 ---------- */
.slide-fade-enter-active {
  transition:
    opacity 0.3s var(--ease-smooth),
    transform 0.3s var(--ease-smooth);
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.slide-fade-leave-active {
  transition: opacity 0.18s ease;
}
.slide-fade-leave-to {
  opacity: 0;
}

/* 尊重系统「减少动态效果」设置 */
@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
  .slide-fade-enter-active,
  .slide-fade-leave-active {
    transition: none;
  }
}
```

- [ ] **Step 2: 创建 `src/utils/storage.js`**

```js
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
```

- [ ] **Step 3: 在 `src/main.js` 引入令牌（放在 element-plus 样式之后、App 之前）**

把 `import './style.css'` 一行改为两行：

```js
import './style.css'
import './styles/tokens.css'
```

- [ ] **Step 4: 核对**

- 浏览器打开 http://localhost:5173/front/landing ，页面外观与之前**完全一致**（令牌只定义变量，尚未使用）。
- DevTools Console 无报错；Elements 里 `<html>` 计算样式能看到 `--ink: rgb(31,31,31)`。

---

### Task 2: 卡通基础组件（KitCard / KitButton / KitIcon / useReveal）

**Files:**
- Create: `src/components/front/KitCard.vue`
- Create: `src/components/front/KitButton.vue`
- Create: `src/components/front/KitIcon.vue`
- Create: `src/composables/useReveal.js`

**Interfaces:**
- `KitCard`：默认插槽；无必填 props；根元素始终带 `.kit-card`
- `KitButton`：props `variant?: 'solid'|'outline'`（默认 outline）、`pill?: boolean`（默认 true）、`color?: 'blue'|'yellow'|'red'|'green'`（solid 时填充色，默认 yellow）；emits `click`；默认插槽
- `KitIcon`：props `name: string`（7 选 1）、`size?: number`（默认 22）；无效 name 渲染 dashboard
- `useReveal()`：返回 `{ root }`，页面把 `root` 绑到容器；挂载后扫描容器内 `.reveal` 元素并在滚入视口时加 `.is-visible`

- [ ] **Step 1: 创建 `src/components/front/KitCard.vue`**

```vue
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
```

- [ ] **Step 2: 创建 `src/components/front/KitButton.vue`**

```vue
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
.kit-btn.is-solid.c-yellow { background: var(--c-yellow); }
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
```

- [ ] **Step 3: 创建 `src/components/front/KitIcon.vue`**

```vue
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
```

- [ ] **Step 4: 创建 `src/composables/useReveal.js`**

```js
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
```

- [ ] **Step 5: 核对**

- `npm run build` 通过（验证三个组件模板可编译）。
  Run: `npm run build`
  Expected: 构建成功，无 vue/compile 错误。

---

### Task 3: 统一占位组件与 5 个模块占位页

**Files:**
- Create: `src/components/front/ModulePlaceholder.vue`
- Create: `src/views/front/Plans.vue`
- Create: `src/views/front/Bills.vue`
- Create: `src/views/front/Diary.vue`
- Create: `src/views/front/Focus.vue`
- Create: `src/views/front/Stats.vue`

**Interfaces:**
- `ModulePlaceholder` props：`icon: string`（KitIcon name）、`title: string`、`phase: string`（如 'P1'）、`desc: string`、`color?: 'blue'|'yellow'|'red'|'green'`（默认 blue）

- [ ] **Step 1: 创建 `src/components/front/ModulePlaceholder.vue`**

```vue
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
```

- [ ] **Step 2: 创建 5 个薄页（内容完全相同，仅 props 不同）**

`src/views/front/Plans.vue`：

```vue
<template>
  <ModulePlaceholder
    icon="plans"
    title="时间计划"
    phase="P1"
    color="blue"
    desc="四象限 / 单列表自由切换，子计划、时间段视图、每日每周每月与遗忘曲线重复，正在赶来。"
  />
</template>

<script setup>
import ModulePlaceholder from '@/components/front/ModulePlaceholder.vue'
</script>
```

`src/views/front/Bills.vue`：

```vue
<template>
  <ModulePlaceholder
    icon="bills"
    title="收支记录"
    phase="P2"
    color="green"
    desc="像喵喵记账一样轻快地记一笔，分类收支与存钱计划，正在赶来。"
  />
</template>

<script setup>
import ModulePlaceholder from '@/components/front/ModulePlaceholder.vue'
</script>
```

`src/views/front/Diary.vue`：

```vue
<template>
  <ModulePlaceholder
    icon="diary"
    title="心情日记"
    phase="P3"
    color="red"
    desc="选一个今天的心情，写张不拘形式的小便签，情绪日历也会一起出现。"
  />
</template>

<script setup>
import ModulePlaceholder from '@/components/front/ModulePlaceholder.vue'
</script>
```

`src/views/front/Focus.vue`：

```vue
<template>
  <ModulePlaceholder
    icon="focus"
    title="专注记录"
    phase="P4"
    color="yellow"
    desc="设定专注时长，关联一条时间计划，开始之后世界先安静一会儿。"
  />
</template>

<script setup>
import ModulePlaceholder from '@/components/front/ModulePlaceholder.vue'
</script>
```

`src/views/front/Stats.vue`：

```vue
<template>
  <ModulePlaceholder
    icon="stats"
    title="数据总结"
    phase="P5"
    color="blue"
    desc="计划完成、收支结构、专注时长，所有数字会在这里自己说话。"
  />
</template>

<script setup>
import ModulePlaceholder from '@/components/front/ModulePlaceholder.vue'
</script>
```

- [ ] **Step 3: 核对**

- `npm run build` 通过。
- 这些页面 Task 5 挂上路由此才能在浏览器看到，本步只需构建通过。

---

### Task 4: AI 聊天页迁移（Home.vue → AiChat.vue，历史会话内收）

**Files:**
- Create: `src/views/front/AiChat.vue`
- 暂不删除 `src/views/front/Home.vue`（Task 5 切走路由后统一删除，防止中途白屏）

**Interfaces:**
- 继续消费 `useChatSessions()`：`sessions, currentId, groupedSessions, currentSession, generating, newSession, selectSession, removeSession, sendMessage, streamingMsg`
- 聊天区模板/样式/脚本与 Home.vue **逐字一致**，仅外层多一个历史小栏；dify.js、chatStore.js 不动

- [ ] **Step 1: 创建 `src/views/front/AiChat.vue`（完整文件）**

```vue
<template>
  <div class="ai-page">
    <!-- ========== AI 页内部：历史会话小栏 ========== -->
    <aside v-show="railOpen" class="rail">
      <div class="rail-head">
        <span class="rail-title">心屿</span>
        <button class="rail-new" @click="createChat" title="新对话">
          <el-icon :size="16"><Plus /></el-icon>
          <span>新对话</span>
        </button>
      </div>

      <div class="rail-scroll">
        <template v-for="g in groupedSessions" :key="g.label">
          <div class="rail-group">{{ g.label }}</div>
          <div
            v-for="s in g.items"
            :key="s.id"
            class="rail-item"
            :class="{ active: s.id === currentId }"
            @click="openChat(s.id)"
          >
            <el-icon :size="14" class="rail-ico"><ChatLineRound /></el-icon>
            <span class="rail-text">{{ s.title }}</span>
            <el-icon class="rail-del" @click.stop="removeSession(s.id)"><Close /></el-icon>
          </div>
        </template>
        <div v-if="!sessions.length" class="rail-empty">还没有对话，点上方「新对话」开始</div>
      </div>

      <button class="rail-collapse" @click="railOpen = false" title="收起历史栏">
        <el-icon :size="15"><Fold /></el-icon>
      </button>
    </aside>

    <!-- 折叠态的重新展开按钮 -->
    <button v-show="!railOpen" class="rail-reopen" @click="railOpen = true" title="展开历史栏">
      <el-icon :size="16"><Expand /></el-icon>
      <span>历史</span>
    </button>

    <!-- ========== 聊天区（与原 Home.vue 完全一致的极简黑白风） ========== -->
    <div class="chat">
      <div v-if="messages.length === 0" class="welcome">
        <h1 class="welcome-title">Hi，有什么可以帮你的吗</h1>
      </div>

      <div v-else ref="msgBoxRef" class="msg-list">
        <div v-for="(m, i) in messages" :key="i" class="msg-row" :class="m.role">
          <div class="msg-col">
            <div class="bubble" :class="{ error: m.error }">
              <span v-if="m.generating && !m.content" class="thinking">
                <i></i><i></i><i></i>
              </span>
              <template v-else>{{ m.content }}</template>
              <span v-if="m.generating && m.content" class="cursor"></span>
            </div>
            <div v-if="m.sources && m.sources.length" class="sources">
              <el-tooltip
                v-for="(src, si) in m.sources"
                :key="si"
                :content="src.content"
                placement="top"
                :show-after="300"
              >
                <span class="src-chip">
                  <el-icon :size="12"><Document /></el-icon>{{ src.name }}
                </span>
              </el-tooltip>
            </div>
          </div>
        </div>
      </div>

      <div class="input-bar">
        <div class="input-card">
          <textarea
            v-model="draft"
            class="input-area"
            rows="1"
            :placeholder="generating ? '心屿正在回复你……' : '给心屿发送消息'"
            :disabled="generating"
            @keydown="onKeydown"
            @input="autoResize"
          />
          <button class="send-btn" :disabled="!canSend" @click="send">
            <el-icon :size="17"><Promotion /></el-icon>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import {
  Promotion,
  Document,
  Plus,
  Close,
  ChatLineRound,
  Fold,
  Expand,
} from '@element-plus/icons-vue'
import { useChatSessions } from '@/utils/chatStore'

const {
  sessions,
  currentId,
  groupedSessions,
  currentSession,
  generating,
  newSession,
  selectSession,
  removeSession,
  sendMessage,
} = useChatSessions()

const railOpen = ref(true)

const createChat = () => {
  newSession()
}
const openChat = (id) => selectSession(id)

const messages = computed(() => currentSession.value?.messages || [])
const draft = ref('')
const msgBoxRef = ref()
const canSend = computed(() => !!draft.value.trim() && !generating.value)

const scrollBottom = () => {
  nextTick(() => {
    if (msgBoxRef.value) msgBoxRef.value.scrollTop = msgBoxRef.value.scrollHeight
  })
}

watch(() => [currentSession.value?.id, messages.value.length], scrollBottom)
watch(() => messages.value.map((m) => m.content).join('|'), scrollBottom)

const send = async () => {
  const text = draft.value.trim()
  if (!text || generating.value) return
  draft.value = ''
  nextTick(() => {
    const ta = document.querySelector('.input-area')
    if (ta) ta.style.height = 'auto'
  })
  await sendMessage(text)
}

const onKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

const autoResize = (e) => {
  const el = e.target
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}
</script>

<style scoped>
.ai-page {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative;
  background: #ffffff;
}

/* ---------- 历史小栏 ---------- */
.rail {
  width: 248px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #ececec;
  background: #fff;
  transition: width 0.25s var(--ease-smooth);
}
.rail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 14px 10px;
}
.rail-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 2px;
}
.rail-new {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12.5px;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.rail-new:hover {
  border-color: #0f0f0f;
  background: #f6f6f6;
}
.rail-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 4px 10px 8px;
}
.rail-group {
  font-size: 11.5px;
  color: #b4b4bc;
  padding: 10px 10px 4px;
}
.rail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 10px;
  border-radius: 9px;
  font-size: 13.5px;
  color: #3f3f46;
  cursor: pointer;
  transition: background 0.15s ease;
}
.rail-item:hover {
  background: #f4f4f4;
}
.rail-item.active {
  background: #ececec;
  color: #0f0f0f;
}
.rail-ico {
  color: #a1a1aa;
  flex-shrink: 0;
}
.rail-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rail-del {
  display: none;
  color: #a1a1aa;
  padding: 3px;
  border-radius: 6px;
}
.rail-item:hover .rail-del {
  display: inline-flex;
}
.rail-del:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}
.rail-empty {
  font-size: 12.5px;
  color: #b4b4bc;
  text-align: center;
  padding: 24px 12px;
  line-height: 1.7;
}
.rail-collapse {
  align-self: center;
  margin-bottom: 10px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #8a8a8a;
  cursor: pointer;
}
.rail-collapse:hover {
  background: #f2f2f2;
}
.rail-reopen {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12.5px;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}
.rail-reopen:hover {
  border-color: #0f0f0f;
}

/* ---------- 以下样式与原 Home.vue 逐字一致 ---------- */
.chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: #ffffff;
}
.welcome {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
}
.welcome-title {
  margin: 0;
  font-size: 34px;
  font-weight: 600;
  color: #0f0f0f;
  letter-spacing: 0;
  text-align: center;
  line-height: 1.3;
}
.msg-list {
  flex: 1;
  overflow-y: auto;
  padding: 32px 0 12px;
}
.msg-row {
  max-width: 760px;
  margin: 0 auto 18px;
  padding: 0 24px;
  display: flex;
}
.msg-row.user {
  justify-content: flex-end;
}
.msg-row.assistant {
  justify-content: flex-start;
}
.msg-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 80%;
}
.msg-row.user .msg-col {
  align-items: flex-end;
}
.msg-row.assistant .msg-col {
  max-width: 100%;
}
.bubble {
  max-width: 100%;
  padding: 11px 16px;
  font-size: 15px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg-row.assistant .bubble {
  color: #0f0f0f;
  padding-left: 4px;
  padding-right: 4px;
  max-width: 100%;
}
.sources {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 4px 0;
}
.src-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: #8a8a8a;
  background: #f6f6f6;
  border: 1px solid #ececec;
  border-radius: 6px;
  padding: 2px 8px;
  cursor: default;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.src-chip:hover {
  color: #4a90d9;
  border-color: #cfe3f7;
}
.msg-row.user .bubble {
  background: #f4f4f4;
  color: #0f0f0f;
  border-radius: 22px;
}
.bubble.error {
  color: #b4543a !important;
  font-size: 14px;
}
.thinking {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 2px;
}
.thinking i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #9a9a9a;
  animation: bounce-dot 1.2s infinite ease-in-out;
}
.thinking i:nth-child(2) { animation-delay: 0.18s; }
.thinking i:nth-child(3) { animation-delay: 0.36s; }
@keyframes bounce-dot {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
  30% { transform: translateY(-5px); opacity: 1; }
}
.cursor {
  display: inline-block;
  width: 2px;
  height: 17px;
  margin-left: 2px;
  vertical-align: -2px;
  background: #0f0f0f;
  animation: blink 0.9s steps(1) infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}
.input-bar {
  padding: 8px 24px 28px;
}
.input-card {
  max-width: 760px;
  margin: 0 auto;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 26px;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 9px 9px 9px 20px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.input-card:focus-within {
  border-color: #0f0f0f;
  box-shadow: 0 0 0 1px #0f0f0f inset;
}
.input-area {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-size: 15px;
  line-height: 1.6;
  font-family: inherit;
  color: #0f0f0f;
  background: transparent;
  max-height: 160px;
}
.input-area::placeholder {
  color: #a8a8a8;
}
.input-area:disabled {
  cursor: not-allowed;
  color: #8a8a8a;
}
.send-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: #0f0f0f;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.18s ease, transform 0.15s ease;
}
.send-btn:hover:not(:disabled) {
  background: #2b2b2b;
}
.send-btn:active:not(:disabled) {
  transform: scale(0.94);
}
.send-btn:disabled {
  background: #e8e8e8;
  cursor: not-allowed;
}
</style>
```

- [ ] **Step 2: 核对**

- `npm run build` 通过（此时 AiChat 尚未挂路由，构建通过即可）。
- 逐段 diff 确认聊天区模板与 Home.vue 第 1-57 行一致、聊天样式与第 117-355 行一致。

---

### Task 5: 路由表切换 + 侧栏平铺改造 + 默认跳转更新 + 旧文件删除

**Files:**
- Modify: `src/router/index.js`（整文件替换）
- Modify: `src/components/FrontendLayout.vue`（整文件替换）
- Modify: `src/views/front/Login.vue:191,209`
- Modify: `src/views/front/Landing.vue:74`
- Delete: `src/views/front/Home.vue`、`src/views/front/Placeholder.vue`

**Interfaces:**
- 路由：`/front/dashboard|plans|bills|diary|focus|stats|ai`，全部 `meta.requiresAuth = true`
- FrontendLayout 消费路由（useRoute/useRouter）+ `useFrontAuth()`，不再消费 chatStore

- [ ] **Step 1: 整文件替换 `src/router/index.js`**

```js
import { createRouter, createWebHistory } from 'vue-router'
import BackendLayout from '@/components/BackendLayout.vue'
import AuthorLayout from '@/components/AuthorLayout.vue'
import FrontendLayout from '@/components/FrontendLayout.vue'

const backendRoutes = [
  {
    // 根路径：进用户端落地页（后台直达 /back/dashboard）
    path: '/',
    redirect: '/front/landing',
  },
  {
    // 兜底：匹配不到的任意路径统一回到首页
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
  {
    // 用户端落地页（全屏独立页，不带布局）
    path: '/front/landing',
    component: () => import('@/views/front/Landing.vue'),
    meta: {
      title: '心屿 XINYU',
    },
  },
  {
    // 用户端登录注册页（全屏独立页，不带布局）
    path: '/front/login',
    component: () => import('@/views/front/Login.vue'),
    meta: {
      title: '登录 / 注册',
    },
  },
  {
    // 用户端工作台
    path: '/front',
    component: FrontendLayout,
    children: [
      { path: '', redirect: '/front/dashboard' },
      {
        path: 'dashboard',
        component: () => import('@/views/front/Dashboard.vue'),
        meta: { title: '仪表盘', requiresAuth: true },
      },
      {
        path: 'plans',
        component: () => import('@/views/front/Plans.vue'),
        meta: { title: '时间计划', requiresAuth: true },
      },
      {
        path: 'bills',
        component: () => import('@/views/front/Bills.vue'),
        meta: { title: '收支记录', requiresAuth: true },
      },
      {
        path: 'diary',
        component: () => import('@/views/front/Diary.vue'),
        meta: { title: '心情日记', requiresAuth: true },
      },
      {
        path: 'focus',
        component: () => import('@/views/front/Focus.vue'),
        meta: { title: '专注记录', requiresAuth: true },
      },
      {
        path: 'stats',
        component: () => import('@/views/front/Stats.vue'),
        meta: { title: '数据总结', requiresAuth: true },
      },
      {
        path: 'ai',
        component: () => import('@/views/front/AiChat.vue'),
        meta: { title: '心屿 AI', requiresAuth: true },
      },
    ],
  },
  {
    path: '/author',
    component: AuthorLayout,
    children: [
      {
        path: 'login',
        component: () => import('@/views/login.vue'),
        meta: { title: '登录' },
      },
      {
        path: 'register',
        component: () => import('@/views/register.vue'),
        meta: { title: '注册' },
      },
    ],
  },
  {
    path: '/back',
    component: BackendLayout,
    children: [
      {
        path: 'dashboard',
        component: () => import('@/views/dashboard.vue'),
        meta: { title: '数据分析', icon: 'DataLine' },
      },
      {
        path: 'knowledge',
        component: () => import('@/views/knowledge.vue'),
        meta: { title: '知识文章', icon: 'Reading' },
      },
      {
        path: 'consultations',
        component: () => import('@/views/consultations.vue'),
        meta: { title: '咨询记录', icon: 'Message' },
      },
      {
        path: 'emotional',
        component: () => import('@/views/emotional.vue'),
        meta: { title: '情绪日志', icon: 'User' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes: backendRoutes,
})

// 用户端登录守卫：未登录访问 /front 内页 → 登录页（带 redirect）
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !localStorage.getItem('frontToken')) {
    return { path: '/front/login', query: { redirect: to.fullPath } }
  }
  // 已登录再访问登录页 → 直接进仪表盘
  if (to.path === '/front/login' && localStorage.getItem('frontToken')) {
    return { path: '/front/dashboard' }
  }
  return true
})

export default router
```

- [ ] **Step 2: 整文件替换 `src/components/FrontendLayout.vue`**

```vue
<template>
  <div class="app">
    <!-- ========== 左侧导航（平铺菜单，无分组标签） ========== -->
    <aside class="sidebar" :class="{ collapsed: isCollapse }">
      <div class="side-top">
        <template v-if="!isCollapse">
          <div class="brand" @click="router.push('/front/dashboard')">
            <img class="brand-logo" :src="logoImg" alt="心屿" />
            <span class="brand-name">心屿</span>
          </div>
          <el-tooltip content="收起侧边栏" placement="bottom" :show-after="400">
            <button class="icon-btn" @click="isCollapse = true">
              <PanelIcon />
            </button>
          </el-tooltip>
        </template>
        <el-tooltip v-else content="打开侧边栏" placement="right" :show-after="200">
          <button class="icon-btn panel-toggle" @click="isCollapse = false">
            <PanelIcon />
          </button>
        </el-tooltip>
      </div>

      <nav class="side-menu" :class="{ center: isCollapse }">
        <el-tooltip
          v-for="item in menus"
          :key="item.path"
          :content="item.name"
          placement="right"
          :disabled="!isCollapse"
          :show-after="200"
        >
          <div
            class="menu-item"
            :class="{ active: route.path === item.path }"
            @click="goMenu(item)"
          >
            <KitIcon :name="item.icon" :size="21" class="menu-icon" />
            <span v-show="!isCollapse" class="menu-label">{{ item.name }}</span>
          </div>
        </el-tooltip>
      </nav>

      <!-- 底部：用户 -->
      <div class="side-footer">
        <el-dropdown
          trigger="click"
          placement="top-start"
          popper-class="user-popover"
          @command="handlePop"
        >
          <div class="user-box" :class="{ center: isCollapse }">
            <el-avatar :size="30" class="user-avatar">{{ avatarChar }}</el-avatar>
            <div v-show="!isCollapse" class="user-meta">
              <span class="user-name">{{ displayName }}</span>
              <el-icon :size="12" class="user-caret"><CaretTop /></el-icon>
            </div>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="m in popMenus"
                :key="m.key"
                :command="m.key"
                :icon="m.icon"
              >
                {{ m.name }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </aside>

    <!-- ========== 右侧内容（路由过渡） ========== -->
    <main class="content">
      <router-view v-slot="{ Component }">
        <transition name="slide-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Setting, QuestionFilled, Star, SwitchButton, CaretTop } from '@element-plus/icons-vue'
import logoImg from '@/assets/images/logo.png'
import KitIcon from '@/components/front/KitIcon.vue'
import { useFrontAuth } from '@/utils/frontAuth'

// 侧栏开关图标（沿用原有左右分栏 SVG）
const PanelIcon = () =>
  h(
    'svg',
    { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 },
    [
      h('rect', { x: 3, y: 4, width: 18, height: 16, rx: 3 }),
      h('line', { x1: 9.5, y1: 4, x2: 9.5, y2: 20 }),
    ]
  )

const route = useRoute()
const router = useRouter()
const { user, logout } = useFrontAuth()

const isCollapse = ref(false)

const displayName = computed(() => user.value?.nickname || user.value?.username || '心屿用户')
const avatarChar = computed(() => displayName.value.charAt(0).toUpperCase())

// 平铺菜单（无分组标签）
const menus = [
  { name: '仪表盘', path: '/front/dashboard', icon: 'dashboard' },
  { name: '时间计划', path: '/front/plans', icon: 'plans' },
  { name: '收支记录', path: '/front/bills', icon: 'bills' },
  { name: '心情日记', path: '/front/diary', icon: 'diary' },
  { name: '专注记录', path: '/front/focus', icon: 'focus' },
  { name: '数据总结', path: '/front/stats', icon: 'stats' },
  { name: '心屿AI', path: '/front/ai', icon: 'ai' },
]

const goMenu = (item) => {
  if (route.path !== item.path) router.push(item.path)
}

const popMenus = [
  { name: '设置', key: 'setting', icon: Setting },
  { name: '帮助与反馈', key: 'help', icon: QuestionFilled },
  { name: '收藏夹', key: 'favorite', icon: Star },
  { name: '退出登录', key: 'logout', icon: SwitchButton },
]

const handlePop = (key) => {
  if (key === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning',
    })
      .then(() => {
        logout()
        ElMessage.success('已退出登录')
        router.replace('/front/landing')
      })
      .catch(() => {})
  } else {
    ElMessage.info('功能建设中')
  }
}
</script>

<style scoped>
.app {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--paper);
  color: var(--ink);
}

/* ---------- 侧边栏 ---------- */
.sidebar {
  width: 256px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-right: 2px solid var(--ink);
  transition: width 0.25s var(--ease-smooth);
}
.sidebar.collapsed {
  width: 64px;
}

.side-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 12px;
}
.sidebar.collapsed .side-top {
  justify-content: center;
  padding: 14px 0;
}
.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
  min-width: 0;
}
.brand-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
}
.brand-name {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 2px;
  white-space: nowrap;
}
.icon-btn {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #3f3f46;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.18s ease;
}
.icon-btn:hover {
  background: #efefef;
}
.panel-toggle {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: #f0f0f0;
}
.panel-toggle:hover {
  background: #e4e4e4;
}

/* ---------- 菜单 ---------- */
.side-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
}
.side-menu.center {
  align-items: center;
  padding: 10px 0;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  padding: 0 14px;
  border: 2px solid transparent;
  border-radius: var(--radius-pill);
  font-size: 14.5px;
  font-weight: 600;
  color: #3f3f46;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.15s ease,
    transform 0.15s var(--ease-spring),
    box-shadow 0.15s var(--ease-smooth),
    color 0.15s ease;
}
.side-menu.center .menu-item {
  width: 44px;
  height: 44px;
  padding: 0;
  justify-content: center;
}
.menu-item:hover {
  background: #f4f4f0;
}
/* 激活：黄色药丸 + 墨线描边 + 硬投影 */
.menu-item.active {
  background: var(--c-yellow);
  border-color: var(--ink);
  box-shadow: 2px 2px 0 var(--ink);
  color: var(--ink);
}
@media (prefers-reduced-motion: no-preference) {
  .menu-item:active {
    transform: translate(1px, 1px);
    box-shadow: 1px 1px 0 var(--ink);
  }
}
.menu-icon {
  flex-shrink: 0;
}

/* ---------- 底部用户 ---------- */
.side-footer {
  padding: 8px 10px 12px;
  border-top: 1px solid #f0f0f0;
}
.user-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.user-box:hover {
  background: #f2f2f2;
}
.user-box.center {
  justify-content: center;
  padding: 6px 0;
}
.user-avatar {
  background: #9a9a9a;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
}
.user-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.user-name {
  font-size: 13.5px;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-caret {
  color: #a1a1aa;
}

/* ---------- 右侧 ---------- */
.content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  background: var(--paper);
}
.content > * {
  flex: 1;
  min-width: 0;
}
</style>

<!-- dropdown 渲染在 body 上，样式不能加 scoped -->
<style>
.user-popover.el-dropdown__popper {
  border-radius: 14px !important;
  padding: 6px !important;
  border: 1px solid #ececec !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1) !important;
}
.user-popover .el-dropdown-menu {
  padding: 2px;
  border: none;
  background: transparent;
}
.user-popover .el-dropdown-menu__item {
  border-radius: 8px;
  font-size: 14px;
  color: #1f1f1f;
}
.user-popover .el-dropdown-menu__item:hover {
  background: #f2f2f2;
  color: #1f1f1f;
}
</style>
```

- [ ] **Step 3: 更新 Login.vue 默认跳转（2 处）**

- 第 191 行：`router.push(route.query.redirect || '/front/home')` → `router.push(route.query.redirect || '/front/dashboard')`
- 第 209 行：`router.push('/front/home')` → `router.push('/front/dashboard')`

- [ ] **Step 4: 更新 Landing.vue 跳转（1 处）**

- 第 74 行：`const enter = () => router.push(isLoggedIn.value ? '/front/home' : '/front/login')` → `const enter = () => router.push(isLoggedIn.value ? '/front/dashboard' : '/front/login')`

- [ ] **Step 5: 删除旧文件**

- 删除 `src/views/front/Home.vue`
- 删除 `src/views/front/Placeholder.vue`

用 DeleteFile 工具删除；删除前确认全仓已无 import 引用（router 已不再引用二者，FrontendLayout 已不引用 Home/chatStore）。

- [ ] **Step 6: 浏览器核对（关键回归）**

1. 未登录态：访问 http://localhost:5173/front/plans → 应跳 `/front/login?redirect=...`
2. 用 username/123456 登录 → 落在 `/front/dashboard`（该页 Task 6 才建，此刻 404 空白属正常，只需确认 URL 与无报错）
3. 手动访问 http://localhost:5173/front/ai ：
   - 左侧出现历史小栏，能看到之前的聊天记录（今天/昨天/更早分组）
   - 点「新对话」→ 发一句「你好」→ 流式回复正常
   - 点历史会话能切换；删除按钮可用；小栏可收起/展开
4. 侧栏折叠/展开正常，激活「心屿AI」为黄色药丸
5. 底部头像下拉 → 退出登录 → 回落落地页
6. `/back/dashboard` 后台页面外观与功能无变化

---

### Task 6: 仪表盘外壳（Dashboard.vue 全量 8 区）

**Files:**
- Create: `src/views/front/Dashboard.vue`

**Interfaces:**
- 纯展示页 P0：不读 storage，所有数据为 0/空；跳转用 `useRouter()`；提示用 `ElMessage`
- 使用：KitCard、KitButton、KitIcon、useReveal、ECharts（`import * as echarts from 'echarts'`）

- [ ] **Step 1: 创建 `src/views/front/Dashboard.vue`（完整文件）**

```vue
<template>
  <div ref="rootRef" class="dash">
    <!-- ① 问候大卡（整色卡，随时间段变色，鼠标 3D 倾斜） -->
    <div
      class="hero reveal"
      :class="`hero-${greeting.tone}`"
      ref="heroRef"
      @mousemove="onTilt"
      @mouseleave="resetTilt"
    >
      <div class="hero-left">
        <div class="hero-date">{{ dateText }}</div>
        <h1 class="hero-title">{{ greeting.word }}，{{ displayName }}</h1>
        <p class="hero-sub">今天也在一点点靠近理想生活。</p>
      </div>
      <div class="hero-actions">
        <KitButton v-for="q in quicks" :key="q.label" class="hero-q" @click="router.push(q.to)">
          <span class="q-plus">＋</span>{{ q.label }}
        </KitButton>
      </div>
      <!-- 装饰几何 -->
      <span class="hero-shape s-circle" aria-hidden="true"></span>
      <span class="hero-shape s-tri" aria-hidden="true"></span>
    </div>

    <!-- ② 今日任务 -->
    <KitCard class="reveal cell cell-tasks">
      <header class="cell-head">
        <h2><KitIcon name="plans" :size="20" /> 今日任务</h2>
        <button class="link" @click="router.push('/front/plans')">＋ 新建</button>
      </header>
      <div class="progress-row">
        <div class="progress-track"><div class="progress-fill" :style="{ width: '0%' }"></div></div>
        <span class="progress-num">0/0 · 0%</span>
      </div>
      <p class="empty-line">今天还没有任务，去时间计划里安排第一件事吧。</p>
      <button class="link center-link" @click="router.push('/front/plans')">查看全部 ›</button>
    </KitCard>

    <!-- ③ 本月结余 -->
    <KitCard class="reveal cell cell-bills">
      <header class="cell-head">
        <h2><KitIcon name="bills" :size="20" /> 本月结余</h2>
        <button class="link green" @click="router.push('/front/bills')">＋ 记账</button>
      </header>
      <div class="big-num">¥0</div>
      <div class="sub-line">收入 ¥0　　支出 ¥0</div>
    </KitCard>

    <!-- ④ 今日专注 -->
    <KitCard class="reveal cell cell-focus">
      <header class="cell-head">
        <h2><KitIcon name="focus" :size="20" /> 今日专注</h2>
      </header>
      <div class="focus-row">
        <div>
          <div class="big-num">0h 00m</div>
          <div class="sub-line">0 轮</div>
        </div>
        <KitButton variant="solid" color="yellow" :pill="false" class="focus-btn" @click="comingSoon">
          ▷ 开始专注
        </KitButton>
      </div>
    </KitCard>

    <!-- ⑤ 今日心情 -->
    <KitCard class="reveal cell cell-mood">
      <header class="cell-head">
        <h2><span class="mood-ico">☺</span> 今日心情</h2>
        <button class="link red" @click="router.push('/front/diary')">日记 ›</button>
      </header>
      <div class="moods">
        <button
          v-for="m in moods"
          :key="m.label"
          class="mood-item"
          @click="comingSoon"
        >
          <span class="mood-emoji">{{ m.emoji }}</span>
          <span class="mood-label">{{ m.label }}</span>
        </button>
      </div>
      <p class="empty-line">不急着定义情绪，先用几句话把它轻轻放在这里。</p>
    </KitCard>

    <!-- ⑥ 今日安排 -->
    <KitCard class="reveal cell cell-schedule">
      <header class="cell-head">
        <h2><KitIcon name="dashboard" :size="20" /> 今日安排</h2>
        <button class="link" @click="router.push('/front/plans')">＋ 新增</button>
      </header>
      <ul class="timeline">
        <li v-for="n in 3" :key="n" class="timeline-item is-empty">
          <span class="t-time">--:--</span>
          <span class="t-bar"></span>
          <span class="t-text">
            <span class="t-title">暂无安排</span>
            <span class="t-place">在时间计划里添加时间段</span>
          </span>
        </li>
      </ul>
    </KitCard>

    <!-- ⑦ 本周专注趋势 -->
    <KitCard class="reveal cell cell-trend">
      <header class="cell-head">
        <h2>↗ 本周专注趋势</h2>
        <button class="link" @click="router.push('/front/stats')">›</button>
      </header>
      <div ref="chartRef" class="chart"></div>
    </KitCard>

    <!-- ⑧ 最近记录 -->
    <KitCard class="reveal cell cell-recent">
      <header class="cell-head">
        <h2><span class="rec-ico">◷</span> 最近记录</h2>
        <button class="link" @click="router.push('/front/stats')">›</button>
      </header>
      <p class="empty-line center-empty">还没有记录，开始第一次专注或记一笔账吧。</p>
    </KitCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import KitCard from '@/components/front/KitCard.vue'
import KitButton from '@/components/front/KitButton.vue'
import KitIcon from '@/components/front/KitIcon.vue'
import { useReveal } from '@/composables/useReveal'
import { useFrontAuth } from '@/utils/frontAuth'

const router = useRouter()
const { root: rootRef } = useReveal()
const { user } = useFrontAuth()

const displayName = computed(() => user.value?.nickname || user.value?.username || '朋友')

// 问候语 + 整卡色调
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h >= 5 && h < 11) return { word: '早上好', tone: 'yellow' }
  if (h >= 11 && h < 14) return { word: '中午好', tone: 'blue' }
  if (h >= 14 && h < 18) return { word: '下午好', tone: 'blue' }
  return { word: '晚上好', tone: 'red' }
})

const dateText = computed(() => {
  const d = new Date()
  const week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日 · ${week}`
})

const quicks = [
  { label: '任务', to: '/front/plans' },
  { label: '日程', to: '/front/plans' },
  { label: '记账', to: '/front/bills' },
  { label: '专注', to: '/front/focus' },
]

const moods = [
  { emoji: '😊', label: '很好' },
  { emoji: '🙂', label: '不错' },
  { emoji: '😐', label: '一般' },
  { emoji: '😪', label: '有点累' },
  { emoji: '😢', label: '有点难过' },
]

const comingSoon = () => ElMessage.info('这个功能马上就来，先期待一下～')

// 问候卡鼠标 3D 倾斜（±3°）
const heroRef = ref(null)
const onTilt = (e) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const el = heroRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const rx = ((e.clientY - r.top) / r.height - 0.5) * -6
  const ry = ((e.clientX - r.left) / r.width - 0.5) * 6
  el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`
}
const resetTilt = () => {
  if (heroRef.value) heroRef.value.style.transform = ''
}

// ECharts：本周专注零数据柱图
const chartRef = ref(null)
let chart = null
const renderChart = () => {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  chart.setOption({
    grid: { left: 30, right: 10, top: 18, bottom: 24 },
    xAxis: {
      type: 'category',
      data: ['一', '二', '三', '四', '五', '六', '日'],
      axisLine: { lineStyle: { color: '#1f1f1f' } },
      axisTick: { show: false },
      axisLabel: { color: '#8a8a8a', fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#ececec', type: 'dashed' } },
      axisLabel: { color: '#b4b4bc', fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        data: [0, 0, 0, 0, 0, 0, 0],
        barWidth: 18,
        itemStyle: {
          color: '#fbbc04',
          borderColor: '#1f1f1f',
          borderWidth: 2,
          borderRadius: [6, 6, 0, 0],
        },
      },
    ],
  })
}
const onResize = () => chart?.resize()
onMounted(() => {
  renderChart()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  chart?.dispose()
})
</script>

<style scoped>
.dash {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 28px 32px 40px;
  background: var(--paper);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-content: start;
}

/* ---------- 问候大卡 ---------- */
.hero {
  grid-column: 1 / -1;
  position: relative;
  overflow: hidden;
  border: var(--line);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-1);
  padding: 32px 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  transition:
    background-color 0.6s var(--ease-smooth),
    transform 0.4s var(--ease-smooth);
  transform-style: preserve-3d;
}
.hero-yellow { background: var(--c-yellow); }
.hero-blue { background: var(--c-blue); }
.hero-red { background: var(--c-red); }
.hero-blue .hero-title,
.hero-blue .hero-sub,
.hero-blue .hero-date,
.hero-red .hero-title,
.hero-red .hero-sub,
.hero-red .hero-date {
  color: #fff;
}
.hero-date {
  font-size: 14px;
  font-weight: 600;
  color: rgba(31, 31, 31, 0.75);
  margin-bottom: 6px;
}
.hero-title {
  margin: 0;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.hero-sub {
  margin: 8px 0 0;
  font-size: 14px;
  color: rgba(31, 31, 31, 0.7);
}
.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.hero-q .q-plus {
  font-weight: 800;
  margin-right: 2px;
}
.hero-shape {
  position: absolute;
  pointer-events: none;
}
.s-circle {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  border: 2px solid rgba(31, 31, 31, 0.25);
  right: -24px;
  bottom: -30px;
}
.s-tri {
  width: 0;
  height: 0;
  border-left: 26px solid transparent;
  border-right: 26px solid transparent;
  border-bottom: 44px solid rgba(31, 31, 31, 0.18);
  left: 42%;
  top: -18px;
  transform: rotate(12deg);
}

/* ---------- 卡片通用 ---------- */
.cell {
  padding: 22px 24px;
  min-height: 188px;
  display: flex;
  flex-direction: column;
}
.cell-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.cell-head h2 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 16px;
  font-weight: 800;
  color: var(--ink);
}
.link {
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: var(--c-blue);
  cursor: pointer;
  padding: 2px 4px;
}
.link.green { color: var(--c-green); }
.link.red { color: var(--c-red); }
.link.center-link {
  align-self: center;
  margin-top: auto;
}
.big-num {
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.sub-line {
  margin-top: 6px;
  font-size: 13px;
  color: #8a8a8a;
}
.empty-line {
  margin: 14px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: #9a9a9a;
}
.center-empty {
  text-align: center;
  margin: auto 0;
}

/* 任务卡 */
.progress-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.progress-track {
  flex: 1;
  height: 12px;
  border: 2px solid var(--ink);
  border-radius: 999px;
  overflow: hidden;
  background: #fff;
}
.progress-fill {
  height: 100%;
  background: var(--c-red);
  border-right: 2px solid var(--ink);
  transition: width 0.5s var(--ease-smooth);
}
.progress-num {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

/* 专注卡 */
.focus-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
}
.focus-btn {
  font-size: 14px;
  padding: 12px 18px;
}

/* 心情卡 */
.mood-ico,
.rec-ico {
  color: var(--c-red);
  font-size: 19px;
}
.moods {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}
.mood-item {
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 6px 4px;
  border-radius: 14px;
  transition: background 0.15s ease, transform 0.15s var(--ease-spring);
}
.mood-item:hover {
  background: var(--c-red-soft);
  transform: translateY(-2px);
}
.mood-emoji {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  border: 2px solid var(--ink);
  border-radius: 50%;
  background: #fff;
}
.mood-label {
  font-size: 12px;
  color: #6b6b6b;
}

/* 安排卡 */
.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.t-time {
  width: 44px;
  font-size: 13px;
  font-weight: 700;
  color: #b4b4bc;
  padding-top: 2px;
}
.t-bar {
  width: 8px;
  height: 8px;
  margin-top: 7px;
  border-radius: 50%;
  border: 2px solid #cfcfcf;
  background: #fff;
  flex-shrink: 0;
}
.t-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.t-title {
  font-size: 14px;
  font-weight: 600;
  color: #9a9a9a;
}
.t-place {
  font-size: 12px;
  color: #b4b4bc;
}

/* 占两列的卡 */
.cell-trend,
.cell-recent {
  min-height: 220px;
}
.chart {
  flex: 1;
  min-height: 150px;
}

/* 响应式：窄屏堆叠 */
@media (max-width: 1100px) {
  .dash {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 760px) {
  .dash {
    grid-template-columns: 1fr;
    padding: 18px 16px 32px;
  }
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
  .hero-actions {
    justify-content: flex-start;
  }
}
</style>
```

- [ ] **Step 2: 浏览器核对**

1. http://localhost:5173/front/dashboard 正常渲染：问候大卡 + 6 张卡片，全部 0/空状态
2. 当前小时对应正确问候语与整卡颜色（改电脑时间可快速验证黄/蓝/红切换与 0.6s 过渡）
3. 鼠标在问候卡上移动有 ±3° 倾斜，离开回正；卡片悬停上浮、按钮按压有回弹
4. 卡片错峰入场动画播放一次；ECharts 显示周一至周日零高度柱图（墨线描边黄柱）
5. 4 个快捷胶囊：任务/日程 → /front/plans，记账 → /front/bills，专注 → /front/focus
6. 「开始专注」与 5 个心情点击弹出「这个功能马上就来」提示
7. 系统设置开启「减少动态效果」（可在 DevTools → Rendering → Emulate prefers-reduced-motion）后刷新：无入场/倾斜动画，内容直接可见
8. 窗口收窄到 1000px、700px 时网格正确降为 2 列 / 1 列

---

### Task 7: 全量回归与构建验收

**Files:**
- 无新增改动；仅在发现问题时回到对应 Task 修复

- [ ] **Step 1: 生产构建**

Run: `npm run build`
Expected: 构建成功；dist 正常产出；无 "Could not resolve import"、无未使用文件引用错误。

- [ ] **Step 2: 对照规格 §2.2 逐条浏览器回归**

- [ ] 侧栏 7 菜单全部可达，刷新后高亮正确
- [ ] 未登录访问 `/front/diary` 等内页跳登录；登录后进 dashboard
- [ ] 退出登录、折叠侧栏、头像菜单与现状一致
- [ ] AI 对话零回归：历史列表、新建、切换、删除、流式回复、引用标签、Enter 发送
- [ ] 仪表盘 8 区齐全、空状态正确、快捷跳转正确
- [ ] 动效丝滑且可被「减少动态效果」关闭
- [ ] 落地页与 /back 后台零变化
- [ ] Console 全程无红色报错（favicon/HMR 类警告除外）

- [ ] **Step 3: 更新规格状态**

把规格文档 `docs/superpowers/specs/2026-09-14-workbench-p0-foundation-design.md` 头部「状态：待用户审核」改为「状态：P0 已实现，待用户验收」。

- [ ] **Step 4: 向用户汇报 P0 完成，请其按清单验收**

---

## Self-Review 记录

**Spec coverage：**
- §2 范围 1-5 → Task 1（令牌/数据层）、Task 5（侧栏/路由）、Task 6（仪表盘）、Task 4（AI 迁移）✓
- §2.2 验收八条 → Task 7 Step 2 逐条覆盖 ✓
- §3 路由 7 条 + 7 处旧引用 → Task 5（路由/守卫/2 个 Login/1 个 Landing/品牌 logo；「新对话/历史」逻辑随 Home 迁入 AiChat，原 FrontendLayout 两处引用随整文件替换消失）✓
- §4 设计令牌/组件/动效/边界 → Task 1+2，AI 页样式在 Task 4 逐字保留 ✓
- §5 仪表盘 8 区 + 时段规则 → Task 6 ✓
- §6 storage.js + key 前缀 → Task 1；数据模型为 P1-P4 预留，P0 不建 store（符合 §6.1 YAGNI）✓
- §7 文件清单 → Task 1-6 全覆盖；KitButton 在 Task 6 实际使用（开始专注/快捷胶囊）；icons 按 Global Constraints 合并为 KitIcon（已注明微调）✓
- §8 风险对策：AI 零回归 → Task 4 Step2 + Task5 Step6 + Task7；样式冲突 → 令牌不覆盖 el- 全局样式；性能 → transform/opacity + reduced-motion；白屏 → Task 顺序保证每步可构建 ✓

**Placeholder scan：** 无 TBD/TODO；所有代码步骤均为完整代码。

**Type/命名一致性：** `useReveal()` 返回 `{ root }`，Task 3 用 `rootRef` 接收、Task 6 同；KitIcon name 取值（dashboard/plans/bills/diary/focus/stats/ai）在 Task 2/5/6 三处完全一致；KitButton props（variant/pill/color）在 Task 2 定义、Task 6 调用一致；storage 函数 load/save/remove 在 Task 1 定义（P0 仅定义，后续期使用）。
