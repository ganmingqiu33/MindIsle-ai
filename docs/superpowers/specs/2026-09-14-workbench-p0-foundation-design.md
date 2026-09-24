# 心屿工作台 P0：地基（导航骨架 + 数据层 + 仪表盘外壳）设计文档

- 日期：2026-09-14
- 状态：待用户审核
- 作者：用户 + AI（brainstorming 协作产出）
- 参考视觉：Google「The Web Can Do What!?」(https://thewebshowcase.withgoogle.com/) 高饱和卡通线条风

---

## 1. 项目总目标

把「心屿」从单一 AI 心理咨询前端，扩展为**个人心理生活工作台**，新增 6 个模块：仪表盘、时间计划、记账、心情日记、专注记录、数据总结，AI 聊天独立成页。

### 分期路线（每期独立可交付，各自走 spec → plan → 实现 → 验证）

| 期 | 内容 | 依赖 |
|---|---|---|
| **P0（本文档）** | 侧栏导航骨架、7 个路由、统一本地数据层、仪表盘外壳、AI 页迁移 | 无 |
| P1 | 时间计划：四象限/单列表切换、子计划、时间段视图、重复（每日/每周/每月/遗忘曲线） | P0 |
| P2 | 记账：收支、分类、存钱计划（参考喵喵记账） | P0 |
| P3 | 心情日记：选情绪 + 便签式日记 + 情绪日历（复用现有情绪日志概念） | P0 |
| P4 | 专注：计时器、可关联时间计划 | P0、P1（关联功能） |
| P5 | 仪表盘接真实数据 + 数据总结页（计划/记账/专注统计，ECharts） | P1-P4 |
| P6 | AI 工作台深化：陪伴机器人 → AI 辅助做计划/记账（Function Calling） | 全部 |

**明确不做**：美味食谱、健康管理、英语学习、咨询模块；落地页改版（以后单独立项）。

---

## 2. P0 范围与验收标准

### 2.1 范围

1. 侧栏改为 7 项平铺菜单（**无「总览/生活/成长」分组标签**）
2. 新建 7 个路由页面，其中仪表盘做完整外壳（卡片均为 0/空状态），5 个模块页为统一占位页，AI 页由现有 Home 迁移
3. 新建本地数据层 `storage.js`（仅薄封装，不建各模块 store）
4. 全站工作台皮肤：Google 卡通线条风设计令牌（CSS 变量）+ 基础动效
5. AI 聊天页保持现有极简黑白风，会话历史收进 AI 页内部

### 2.2 验收标准

- [ ] 侧栏 7 个菜单全部可达，当前页高亮正确，浏览器刷新后高亮不丢
- [ ] 未登录访问任意 `/front/*` 内页 → 跳登录页；登录后默认进入 `/front/dashboard`
- [ ] 退出登录、折叠/展开侧栏、底部头像菜单行为与现状一致
- [ ] **AI 对话零回归**：AI 页内可见历史会话列表、能新建会话、Dify 流式回复与引用标签正常
- [ ] 仪表盘 8 个卡片区域按设计排布，全部显示空/0 状态，4 个快捷按钮可跳到对应占位页
- [ ] 卡片入场动效、悬停回弹、问候卡鼠标 3D 倾斜丝滑；系统开启「减少动态效果」时动效自动关闭
- [ ] 落地页（Landing）与后台（/back）代码与视觉零改动
- [ ] `npm run build` 构建通过，无控制台报错

---

## 3. 信息架构与路由

### 3.1 路由表

| 路径 | 组件 | 说明 |
|---|---|---|
| `/front/dashboard` | `views/front/Dashboard.vue` | 仪表盘，登录后默认首页 |
| `/front/plans` | `views/front/Plans.vue` | 时间计划（P0 占位） |
| `/front/bills` | `views/front/Bills.vue` | 收支记录（P0 占位） |
| `/front/diary` | `views/front/Diary.vue` | 心情日记（P0 占位） |
| `/front/focus` | `views/front/Focus.vue` | 专注记录（P0 占位） |
| `/front/stats` | `views/front/Stats.vue` | 数据总结（P0 占位） |
| `/front/ai` | `views/front/AiChat.vue` | 心屿 AI（Home.vue 迁入） |

- 删除 `/front/knowledge` 路由与旧 `/front/emotion`、`/front/home`
- 删除 `views/front/Placeholder.vue`，由统一的 `components/front/ModulePlaceholder.vue` 替代
- 根路径 `/` → `/front/landing`、兜底重定向均不变

### 3.2 需要同步修改的 7 处旧首页引用（当前指向 `/front/home`）

| 文件 | 位置 | 改为 |
|---|---|---|
| `router/index.js` | 已登录访问登录页的重定向 | `/front/dashboard` |
| `Landing.vue` | 登录用户「立即体验」跳转 | `/front/dashboard` |
| `Login.vue` | 登录成功默认跳转（2 处，redirect 参数缺省时） | `/front/dashboard` |
| `FrontendLayout.vue` | logo 点击 | `/front/dashboard` |
| `FrontendLayout.vue` | 新建会话/打开历史会话 | `/front/ai`（2 处逻辑迁入 AI 页后处理） |

### 3.3 侧栏菜单（平铺，无分组标签）

按顺序：

1. 仪表盘（`/front/dashboard`）
2. 时间计划（`/front/plans`）
3. 收支记录（`/front/bills`）
4. 心情日记（`/front/diary`）
5. 专注记录（`/front/focus`）
6. 数据总结（`/front/stats`）
7. 心屿AI（`/front/ai`）

保留：顶部 logo + 折叠开关、折叠态只显图标（宽 256px / 64px）、底部用户头像 + el-dropdown（设置/帮助与反馈/收藏夹/退出登录）。
移除：全局侧栏中的「历史对话」区块（迁入 AiChat 页内左栏，可折叠）。

---

## 4. 视觉设计（Google 卡通线条风设计令牌）

### 4.1 色板（CSS 变量，挂在 `:root`，作用域限工作台）

```css
--ink: #1f1f1f;            /* 墨线/主文字/描边 */
--paper: #f6f5f0;          /* 画布底色（暖米灰） */
--card: #ffffff;           /* 卡片纸面 */
--c-blue: #1a73e8;         /* 时间计划 / AI */
--c-yellow: #fbbc04;       /* 专注 */
--c-red: #ea4335;          /* 心情 */
--c-green: #34a853;        /* 记账 */
--c-blue-soft: #e8f0fe;
--c-yellow-soft: #fef7e0;
--c-red-soft: #fce8e6;
--c-green-soft: #e6f4ea;
```

模块用色全站一致，P1-P4 沿用，不随意改色。

### 4.2 组件语言

- **卡通卡片**：白底、`2px solid var(--ink)`、圆角 24px、硬投影 `4px 4px 0 var(--ink)`；无模糊阴影
- 悬停：`translateY(-2px)`，投影变 `6px 6px 0`，时长 180ms；按下 `scale(.97)`
- **药丸按钮**：胶囊圆角 999px、2px 墨线描边、硬投影 2px；主按钮按模块色填充
- **标签**：黄色填充胶囊 + 黑字（"The web can" 小药丸同款）
- **图标**：自绘 2px 黑描边卡通线条 SVG 组件（放 `components/front/icons/`），不用 Element Plus 默认图标做菜单
- **装饰**：卡片角落纯 SVG 几何形状（圆/三角/扇形/方块），轻微旋转 8~15°，仅装饰不承载信息
- 字体：系统无衬线栈，标题字重 800、字距 -0.01em；正文 14px

### 4.3 动效令牌

```css
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);  /* 回弹 */
--ease-smooth: cubic-bezier(0.22, 1, 0.36, 1);     /* 通用丝滑 */
```

- 卡片入场：`opacity 0→1 + translateY(16px)→0 + rotate(-1deg)→0`，按卡片顺序每张延迟 60ms
- 问候卡：mousemove 时 3D 倾斜 ±3°（perspective 1000px），离开回正，0.4s smooth
- 路由切换：Vue `<Transition>` 滑入 0.3s（slide-fade）
- 全部动效包裹在 `@media (prefers-reduced-motion: no-preference)` 中
- P0 不引入新依赖；GSAP 留到 P6

### 4.4 边界（已定）

- **AI 聊天页（/front/ai）保持现有极简黑白风**（白底、浅灰用户气泡、无头像、黑字 AI 回复），不套卡通皮肤
- **落地页不改**（蓝白风保留，未来单独立项）
- 后台 `/back` 完全不动

---

## 5. 仪表盘 P0 布局（外壳，全部空状态）

参考用户提供的第二张图的**布局结构**，皮肤换成第 4 节卡通风。

```
┌─────────────────────────────────────────────────────────────┐
│ 问候大卡（整色卡，随时间段变色：早上好=黄 / 中午好=蓝 / 晚上好=红）│
│ 9月14日 · 星期一    中午好，{昵称}    副标题「今天也在一点点…」  │
│                              [＋任务] [日程] [记账] [专注] 胶囊 │
├───────────────┬─────────────────┬───────────────────────────┤
│ 今日任务       │ 本月结余          │ 今日专注        [开始专注]  │
│ 0/0 · 0% 进度条 │ ¥0（收入0/支出0） │ 0h00m · 0 轮              │
│ （空状态文案）  │                  │                           │
├───────────────┴────────┬────────┴───────────────────────────┤
│ 今日心情               │ 今日安排                          │
│ 5 个情绪 emoji 选择器    │ 时间线空状态（3 条占位骨架）          │
│ （P0 仅展示，P3 接功能） │                                  │
├────────────────────────┴────────────────────────────────────┤
│ 本周专注趋势（ECharts 空图/占位）  │ 最近记录（空列表）          │
└─────────────────────────────────────────────────────────────┘
```

- 不做图中的「学习进度」「健康状态」卡
- 快捷胶囊跳转：任务/日程 → `/front/plans`，记账 → `/front/bills`，专注 → `/front/focus`
- 「今日心情」emoji 选择器 P0 只渲染不可点（或点击提示"功能即将上线"）；「开始专注」同
- 「日记 ›」「查看全部 ›」「新增」等箭头 P0 跳占位页
- 图表区 P0 用 ECharts 渲染空数据占位图（该依赖已安装）

### 5.1 问候语时段规则

- 05:00-10:59 早上好（黄）｜11:00-13:59 中午好（蓝）｜14:00-17:59 下午好（蓝）｜18:00-04:59 晚上好（红）
- 整色卡背景色切换走 0.6s `--ease-smooth` 过渡（同色系内蓝→蓝不触发变化）

---

## 6. 数据层设计

### 6.1 选型：方案 A——薄封装 + 模块单例（与现有 chatStore 同模式）

理由：与现有代码一致、零新依赖、学习曲线平滑。新建 `src/utils/storage.js`：

```js
// API（P0 只实现这 4 个函数）
load(key, fallback)      // 读 + JSON.parse，异常返回 fallback
save(key, value)         // JSON.stringify 写入
remove(key)
exportStorage()          // P0 不实现，P2 记账期补：导出全部 xinyu:* 数据为 JSON
importStorage(json)      // 同上，后续补
```

- 所有 key 统一前缀 `xinyu:`，与现有 `xinyu-chat-sessions`、`xinyu-visitor-id` 命名对齐
- 迁后端路径：未来只把 storage.js 内部实现从 localStorage 换成异步 fetch，页面层通过各 store 接口隔离，不直接调 storage
- 现有 `chatStore.js` 不重写（YAGNI），仅历史 UI 区块搬迁

### 6.2 各模块数据模型（P0 定稿字段，P1-P4 直接使用，避免返工）

**计划 plan**（localStorage key: `xinyu:plans`，存数组）

```js
{
  id: number,                 // Date.now()
  title: string,
  note: string,               // 备注/地点
  quadrant: 1|2|3|4,          // 四象限：1重要紧急 2重要不紧急 3紧急不重要 4不重要不紧急
  date: 'YYYY-MM-DD',         // 归属日期
  startTime: 'HH:mm' | null,  // 时间段起；null = 全天
  endTime: 'HH:mm' | null,
  parentId: number | null,    // 子计划指向父计划；null 为顶层
  order: number,              // 单列表排序
  done: boolean,
  doneAt: number | null,
  repeat: {
    type: 'none'|'daily'|'weekly'|'monthly'|'forgetting',
    weekdays?: number[],      // weekly：0-6
    monthDays?: number[],     // monthly：1-31
    interval?: number,        // 预留：每 N 天/周/月
  },
  createdAt: number,
}
```

遗忘曲线重复：type='forgetting' 的计划完成后，按「1天、2天、4天、7天、15天、30天」自动生成下一次复习实例（P1 实现，P0 只定字段）。

**账单 bill**（`xinyu:bills`）

```js
{
  id: number,
  type: 'income' | 'expense',
  amount: number,             // 单位：元，两位小数
  category: string,           // 分类 id，见 categories
  account: string,            // 预留：账户（现金/支付宝…），P2 定
  note: string,
  date: 'YYYY-MM-DD HH:mm',
  savingPlanId: number | null,// 关联存钱计划的存入记录
  createdAt: number,
}
```

**存钱计划 savingPlan**（`xinyu:saving-plans`）

```js
{ id, title, targetAmount, savedAmount, deadline /*YYYY-MM-DD*/, color, icon, createdAt, archived }
```

**分类**：P0 只留注释，P2 在 billsStore 内建默认分类表（餐饮/交通/购物/工资…），用模块色系。

**日记 diary**（`xinyu:diary`）

```js
{
  id: number,
  date: 'YYYY-MM-DD',         // 一天可多条？→ 定：一天一条主日记，可追加多条心情打卡
  mood: 1|2|3|4|5,            // 对应 很好/不错/一般/有点累/有点难过
  content: string,            // 便签正文
  tags: string[],
  createdAt: number,
}
```

情绪日历由 diary 数据按 date 聚合渲染（P3）。

**专注 focusSession**（`xinyu:focus`）

```js
{
  id: number,
  planId: number | null,      // 关联的计划
  duration: number,           // 实际专注秒数
  plannedDuration: number,    // 设定秒数
  startedAt: number,
  note: string,
  createdAt: number,
}
```

### 6.3 数据隔离与多用户

当前登录为本地单用户（frontAuth localStorage），P0-P5 数据不按用户隔离（同一浏览器同一数据集）。P6 或迁后端时再处理。此限制写入 P5 验收备注。

---

## 7. 文件改动清单

| 动作 | 文件 | 说明 |
|---|---|---|
| 新建 | `src/styles/tokens.css` | 设计令牌（颜色/圆角/阴影/动效），main.js 引入 |
| 新建 | `src/utils/storage.js` | localStorage 薄封装 |
| 新建 | `src/composables/useReveal.js` | IntersectionObserver 入场动效组合式函数 |
| 新建 | `src/components/front/KitCard.vue` | 统一卡通卡片 |
| 新建 | `src/components/front/KitButton.vue` | 药丸/方块卡通按钮（可选，也可直接 class） |
| 新建 | `src/components/front/ModulePlaceholder.vue` | 模块建设中占位（卡通空状态 + 几何装饰） |
| 新建 | `src/components/front/icons/*.vue` | 7 个菜单卡通线条图标 |
| 新建 | `src/views/front/Dashboard.vue` | 仪表盘外壳（8 区） |
| 新建 | `Plans.vue / Bills.vue / Diary.vue / Focus.vue / Stats.vue` | 5 个薄占位页 |
| 迁移 | `src/views/front/Home.vue` → `AiChat.vue` | 内含会话历史小栏；聊天/Dify 逻辑不动 |
| 改造 | `src/components/FrontendLayout.vue` | 平铺菜单、移除历史区块、卡通激活态 |
| 改造 | `src/router/index.js` | 路由表、默认首页、守卫 |
| 微调 | `Login.vue`、`Landing.vue` | 默认跳转改 dashboard |
| 删除 | `src/views/front/Placeholder.vue`、`Home.vue`（迁移后删旧） | |

`chatStore.js` 逻辑零改动（AI 页 UI 直接复用）。

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| AI 页迁移破坏聊天/历史 | 纯组件搬迁，store 与 dify.js 不动；验收第 4 条专项回归 |
| 卡通风与 Element Plus 默认样式冲突 | 工作台页面用自定义 class，不全局覆盖 el- 样式；弹窗类仍用 EP 默认（AI 页不冲突） |
| 动效过多影响性能 | 只做 transform/opacity 动画；入场只首屏触发；遵守 prefers-reduced-motion |
| 一次性大改导致白屏 | 按路由 → 布局 → 仪表盘顺序提交，每步 dev server 验证 |

## 9. P0 之后（预告，不在本期实现）

P1 时间计划交互最复杂，将单独 brainstorm：四象限矩阵（模块色四象限）与单列表切换、时间段日视图（小时轴）、重复规则生成器（含遗忘曲线复习实例）、子计划折叠。
