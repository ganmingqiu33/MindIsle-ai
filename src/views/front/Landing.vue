<template>
  <div class="landing">
    <!-- ========== 顶栏 ========== -->
    <header class="topbar rv">
      <div class="logo" @click="enter">
        <img class="logo-img" :src="logoImg" alt="心屿" />
        <span class="logo-cn">心屿</span>
        <span class="logo-en">MIND ISLE</span>
      </div>
      <div class="top-actions">
        <KitButton v-if="!isLoggedIn" variant="outline" @click="goLogin">登录 / 注册</KitButton>
        <template v-else>
          <KitButton class="top-enter" variant="solid" color="blue" @click="enter">进入工作台 →</KitButton>
          <UserAvatar class="top-avatar" :avatar-id="user?.avatar" :size="38" @click="enter" />
        </template>
      </div>
    </header>

    <!-- ========== 主视觉 ========== -->
    <main class="hero">
      <div class="hero-text">
        <span class="hero-badge rv" :style="{ '--d': '.08s' }">✦ AI 心灵陪伴 · 情绪自护</span>
        <h1 class="hero-title rv" :style="{ '--d': '.16s' }">心屿</h1>
        <p class="hero-slogan rv" :style="{ '--d': '.24s' }">一座安放情绪的小岛</p>
        <p class="hero-desc rv" :style="{ '--d': '.32s' }">
          潮汐有起落，心事有归处。<br />
          AI 陪伴、心情日记、四象限计划、专注计时与数据洞察，<br />
          心屿倾听你的每一句欲言又止，陪你把情绪轻轻放下。
        </p>
        <div class="hero-cta rv" :style="{ '--d': '.4s' }">
          <KitButton class="cta-main" variant="solid" color="yellow" :pill="false" @click="enter">
            立即体验 <span class="cta-arrow">→</span>
          </KitButton>
          <KitButton variant="outline" @click="scrollToFeatures">了解功能 ↓</KitButton>
        </div>
        <p class="hero-note rv" :style="{ '--d': '.48s' }">打开网页就能用 · 记录仅自己可见</p>
      </div>

      <!-- 产品预览窗口 + 漂浮贴纸 -->
      <div class="hero-visual rv" :style="{ '--d': '.3s' }">
        <span class="hv-deco hv-spark s1">✦</span>
        <span class="hv-deco hv-spark s2">✦</span>
        <span class="hv-deco hv-cross">＋</span>

        <!-- 主窗口 -->
        <div class="window float-a">
          <div class="win-bar">
            <span class="dots"><i class="d-red" /><i class="d-yellow" /><i class="d-green" /></span>
            <span class="win-title">心屿 · 今日小岛</span>
          </div>
          <div class="win-body">
            <div class="win-greet">
              <div>
                <p class="g-hi">早安，欢迎回岛</p>
                <p class="g-date">9 月 16 日 · 星期二 · 晴</p>
              </div>
              <span class="g-mood">🌤</span>
            </div>

            <div class="win-stats">
              <div class="ws ws-blue"><b>45<em>分钟</em></b><span>今日专注</span></div>
              <div class="ws ws-green"><b>3<em>件</em></b><span>完成计划</span></div>
              <div class="ws ws-yellow"><b>7<em>天</em></b><span>连续记录</span></div>
            </div>

            <div class="win-panel">
              <p class="wp-title">今日计划</p>
              <div class="task done"><i class="tk tk-green"><svg viewBox="0 0 12 12"><path d="M2 6.5 4.8 9 10 3.2" /></svg></i><span>晨跑 3 公里</span></div>
              <div class="task"><i class="tk tk-red" /><span>整理本周工作复盘</span></div>
              <div class="task"><i class="tk tk-yellow" /><span>给家里打个电话</span></div>
            </div>

            <div class="win-panel">
              <div class="wp-head"><p class="wp-title">本周专注</p><span class="wp-trend">↗ 22%</span></div>
              <div class="bars">
                <i v-for="(h, i) in weekBars" :key="i" :style="{ height: h + '%' }" :class="{ on: i === 5 }" />
              </div>
              <div class="bar-labels"><span v-for="d in weekDays" :key="d">{{ d }}</span></div>
            </div>
          </div>
        </div>

        <!-- 漂浮贴纸：AI 对话 -->
        <div class="pop pop-chat float-b">
          <span class="pop-tag tag-blue">心屿</span>
          <span class="pop-line">我在听，慢慢说 💙</span>
        </div>

        <!-- 漂浮贴纸：专注环 -->
        <div class="pop pop-ring float-c">
          <svg viewBox="0 0 100 100">
            <circle class="r-track" cx="50" cy="50" r="42" />
            <circle class="r-prog" cx="50" cy="50" r="42" pathLength="100" stroke-dasharray="68 32" />
          </svg>
          <span class="ring-num">25:00</span>
          <span class="ring-cap">专注中</span>
        </div>

        <!-- 漂浮贴纸：心情 -->
        <div class="pop pop-mood float-b">
          <span class="mood-emoji">🙂</span>
          <span class="mood-txt"><b>平静</b><small>今日心情</small></span>
        </div>
      </div>
    </main>

    <!-- ========== 五个专题 ========== -->
    <main ref="featureRef" class="topics">
      <p class="topics-kicker rv">— 一座小岛，五种陪伴 —</p>
      <h2 class="topics-title rv">从倾诉到行动，<br />陪你走完情绪自护的每一步</h2>

      <!-- 01 心屿 AI -->
      <section class="topic t-blue rv">
        <div class="topic-visual">
          <div class="mock mock-chat">
            <div class="bub bub-user"><p>最近总觉得很累，又说不出为什么…</p></div>
            <div class="bub-row">
              <span class="bub-ava">AI</span>
              <div class="bub bub-ai"><p>这种疲惫是什么时候开始的？不着急，我陪你慢慢理一理。</p></div>
            </div>
            <div class="bub bub-user short"><p>好像从上周开始</p></div>
            <div class="bub-row">
              <span class="bub-ava">AI</span>
              <div class="bub bub-ai typing"><i /><i /><i /></div>
            </div>
            <div class="chat-input"><span>想说点什么…</span><b class="send"><svg viewBox="0 0 16 16"><path d="M2 8h11M9 4l4 4-4 4" /></svg></b></div>
          </div>
        </div>
        <div class="topic-copy">
          <span class="t-no">01</span>
          <span class="t-kick"><i />心屿 AI · 随时在线的情绪出口</span>
          <h3>想说的时候，<br />总有人在听</h3>
          <p class="t-lead">不用组织语言，也不用怕打扰谁。心屿 24 小时亮着灯，等你把今天的心事靠岸。</p>
          <ul class="t-list">
            <li><i class="li-ico"><svg viewBox="0 0 12 12"><path d="M2 6.5 4.8 9 10 3.2" /></svg></i><div><b>零评判的倾听</b>：焦虑、委屈、说不出口的念头，都可以先放在这儿</div></li>
            <li><i class="li-ico"><svg viewBox="0 0 12 12"><path d="M2 6.5 4.8 9 10 3.2" /></svg></i><div><b>陪你理清感受</b>：从一团乱麻里，一起找到情绪的名字和来由</div></li>
            <li><i class="li-ico"><svg viewBox="0 0 12 12"><path d="M2 6.5 4.8 9 10 3.2" /></svg></i><div><b>对话只属于你</b>：私密空间，随时回看那些被温柔接住的瞬间</div></li>
          </ul>
          <KitButton variant="outline" @click="enter">和心屿聊聊 <span class="cta-arrow">→</span></KitButton>
        </div>
      </section>

      <!-- 02 心情日记 -->
      <section class="topic t-yellow rev rv">
        <div class="topic-visual">
          <div class="mock mock-diary">
            <span class="tape" />
            <p class="dy-date">9 月 16 日 · 星期二</p>
            <p class="dy-title">今天的心情</p>
            <div class="dy-moods">
              <span>😄</span><span class="sel">🙂</span><span>😌</span><span>😢</span><span>😰</span>
            </div>
            <div class="dy-lines">
              <i style="width: 92%" /><i style="width: 86%" /><i style="width: 64%" /><i style="width: 78%" /><i style="width: 40%" />
            </div>
            <div class="dy-foot">
              <span class="dy-polaroid"><b>🏝</b><small>心屿的晚霞</small></span>
              <span class="dy-save">已存档 · 连续 7 天</span>
            </div>
          </div>
        </div>
        <div class="topic-copy">
          <span class="t-no">02</span>
          <span class="t-kick"><i />心情日记 · 最轻量的情绪存档</span>
          <h3>把心情写下来，<br />它就轻了一点</h3>
          <p class="t-lead">不必写满一页。一个表情、两三句话，就是今天和自己的一次认真打招呼。</p>
          <ul class="t-list">
            <li><i class="li-ico"><svg viewBox="0 0 12 12"><path d="M2 6.5 4.8 9 10 3.2" /></svg></i><div><b>三秒完成记录</b>：选个心情，写一两句话，情绪就有了安放处</div></li>
            <li><i class="li-ico"><svg viewBox="0 0 12 12"><path d="M2 6.5 4.8 9 10 3.2" /></svg></i><div><b>情绪潮汐回看</b>：连续记录汇成日历，看见好心情都从哪来</div></li>
            <li><i class="li-ico"><svg viewBox="0 0 12 12"><path d="M2 6.5 4.8 9 10 3.2" /></svg></i><div><b>写给未来的自己</b>：某天回头看，会发现已经走了这么远</div></li>
          </ul>
          <KitButton variant="outline" @click="enter">写一篇日记 <span class="cta-arrow">→</span></KitButton>
        </div>
      </section>

      <!-- 03 四象限计划 -->
      <section class="topic t-red rv">
        <div class="topic-visual">
          <div class="mock mock-matrix">
            <p class="mx-title">四象限 · 今天先做什么？</p>
            <div class="mx-grid">
              <div class="mx-cell mx-red">
                <span class="mx-k">紧急<span>·</span>重要</span>
                <i class="mx-chip c-red">整理工作复盘</i>
                <i class="mx-chip c-red">回重要邮件</i>
              </div>
              <div class="mx-cell mx-green">
                <span class="mx-k">重要<span>·</span>不紧急</span>
                <i class="mx-chip c-green">每周运动 3 次</i>
                <i class="mx-chip c-green">读半本书</i>
              </div>
              <div class="mx-cell mx-yellow">
                <span class="mx-k">紧急<span>·</span>不重要</span>
                <i class="mx-chip c-yellow">取个快递</i>
              </div>
              <div class="mx-cell mx-blue">
                <span class="mx-k">不紧急<span>·</span>不重要</span>
                <i class="mx-chip c-blue">刷短视频</i>
              </div>
            </div>
          </div>
        </div>
        <div class="topic-copy">
          <span class="t-no">03</span>
          <span class="t-kick"><i />四象限计划 · 把焦虑变成清单</span>
          <h3>事情越多，<br />越要先分清轻重</h3>
          <p class="t-lead">脑子装不下的时候，把事情摊开在四个格子里——先做什么、可以晚点做什么，一眼就清楚。</p>
          <ul class="t-list">
            <li><i class="li-ico"><svg viewBox="0 0 12 12"><path d="M2 6.5 4.8 9 10 3.2" /></svg></i><div><b>想到就先记下</b>：不用立刻分类，先倒出来，心就空了一半</div></li>
            <li><i class="li-ico"><svg viewBox="0 0 12 12"><path d="M2 6.5 4.8 9 10 3.2" /></svg></i><div><b>拖拽完成归类</b>：拖进对应象限，轻重缓急自动排好</div></li>
            <li><i class="li-ico"><svg viewBox="0 0 12 12"><path d="M2 6.5 4.8 9 10 3.2" /></svg></i><div><b>与专注联动</b>：每件计划一键开始计时，打勾瞬间成就感到账</div></li>
          </ul>
          <KitButton variant="outline" @click="enter">规划我的一天 <span class="cta-arrow">→</span></KitButton>
        </div>
      </section>

      <!-- 04 专注计时 -->
      <section class="topic t-green rev rv">
        <div class="topic-visual">
          <div class="mock mock-focus">
            <div class="fc-ring">
              <svg viewBox="0 0 200 200">
                <circle class="fc-track" cx="100" cy="100" r="84" />
                <circle class="fc-prog" cx="100" cy="100" r="84" pathLength="100" stroke-dasharray="72 28" />
              </svg>
              <div class="fc-center"><b>18:24</b><span>深度专注中</span></div>
            </div>
            <div class="fc-dots"><i class="on" /><i class="on" /><i /><i /></div>
            <p class="fc-seed">第 2 组 · 再攒一棵小树 🌱</p>
            <div class="fc-actions">
              <span class="fc-btn primary"><svg viewBox="0 0 12 12"><rect x="3" y="2" width="2.2" height="8" /><rect x="6.8" y="2" width="2.2" height="8" /></svg>暂停</span>
              <span class="fc-btn">结束</span>
            </div>
          </div>
        </div>
        <div class="topic-copy">
          <span class="t-no">04</span>
          <span class="t-kick"><i />专注计时 · 一次只陪一件事</span>
          <h3>一次只做一件事，<br />本身就是休息</h3>
          <p class="t-lead">25 分钟里世界很安静，只有你和手头那件事。心屿帮你挡住时间，也挡住分心。</p>
          <ul class="t-list">
            <li><i class="li-ico"><svg viewBox="0 0 12 12"><path d="M2 6.5 4.8 9 10 3.2" /></svg></i><div><b>番茄工作法</b>：25 分钟专注 + 5 分钟休息，节奏交给心屿</div></li>
            <li><i class="li-ico"><svg viewBox="0 0 12 12"><path d="M2 6.5 4.8 9 10 3.2" /></svg></i><div><b>绑定具体计划</b>：确保时间花在真正重要的那个格子里</div></li>
            <li><i class="li-ico"><svg viewBox="0 0 12 12"><path d="M2 6.5 4.8 9 10 3.2" /></svg></i><div><b>心流被攒下来</b>：每组专注都有记录，长成你的专注森林</div></li>
          </ul>
          <KitButton variant="outline" @click="enter">开始一次专注 <span class="cta-arrow">→</span></KitButton>
        </div>
      </section>

      <!-- 05 数据洞察 -->
      <section class="topic t-purple rv">
        <div class="topic-visual">
          <div class="mock mock-stats">
            <div class="st-row">
              <div class="st-bars">
                <p class="st-title">本周专注 <b>3.5h</b></p>
                <div class="st-chart">
                  <i v-for="(h, i) in statBars" :key="i" :style="{ height: h + '%' }" :class="{ on: i === 5 }" />
                </div>
                <div class="bar-labels"><span v-for="d in weekDays" :key="d">{{ d }}</span></div>
              </div>
              <div class="st-donut">
                <svg viewBox="0 0 120 120">
                  <circle class="dn-track" cx="60" cy="60" r="44" />
                  <circle cx="60" cy="60" r="44" pathLength="100" stroke="var(--c-red)" stroke-dasharray="36 64" stroke-dashoffset="0" />
                  <circle cx="60" cy="60" r="44" pathLength="100" stroke="var(--c-green)" stroke-dasharray="28 72" stroke-dashoffset="-37.5" />
                  <circle cx="60" cy="60" r="44" pathLength="100" stroke="var(--c-yellow)" stroke-dasharray="20 80" stroke-dashoffset="-67" />
                  <circle cx="60" cy="60" r="44" pathLength="100" stroke="var(--c-blue)" stroke-dasharray="13 87" stroke-dashoffset="-88.5" />
                </svg>
                <b>97%</b>
              </div>
            </div>
            <ul class="st-legend">
              <li><i style="background: var(--c-red)" />重要紧急 <b>36%</b></li>
              <li><i style="background: var(--c-green)" />长期成长 <b>28%</b></li>
              <li><i style="background: var(--c-yellow)" />日常琐事 <b>20%</b></li>
              <li><i style="background: var(--c-blue)" />放松留白 <b>13%</b></li>
            </ul>
          </div>
        </div>
        <div class="topic-copy">
          <span class="t-no">05</span>
          <span class="t-kick"><i />数据洞察 · 看得见的成长</span>
          <h3>每一点进步，<br />都值得被看见</h3>
          <p class="t-lead">日子看似重复，但数据记得：你专注了多久、完成了什么、正在变成什么样的人。</p>
          <ul class="t-list">
            <li><i class="li-ico"><svg viewBox="0 0 12 12"><path d="M2 6.5 4.8 9 10 3.2" /></svg></i><div><b>专注趋势</b>：今天比上周多走了几步，图表替你记着</div></li>
            <li><i class="li-ico"><svg viewBox="0 0 12 12"><path d="M2 6.5 4.8 9 10 3.2" /></svg></i><div><b>计划分布</b>：时间花在哪类事情上，一目了然，方便复盘</div></li>
            <li><i class="li-ico"><svg viewBox="0 0 12 12"><path d="M2 6.5 4.8 9 10 3.2" /></svg></i><div><b>三种时间尺度</b>：今日、7 天、累积，既看当下也看长期</div></li>
          </ul>
          <KitButton variant="outline" @click="enter">看看我的数据 <span class="cta-arrow">→</span></KitButton>
        </div>
      </section>
    </main>

    <!-- ========== 结尾 CTA ========== -->
    <section class="closing rv">
      <div class="closing-card">
        <span class="cl-moon">☾</span>
        <h2>今天，也想听听你的心情</h2>
        <p>不用准备好，从一句话开始就够了。</p>
        <KitButton variant="solid" color="yellow" :pill="false" @click="enter">
          立即体验 <span class="cta-arrow">→</span>
        </KitButton>
        <svg class="cl-wave" viewBox="0 0 1200 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 50 Q 150 10 300 50 T 600 50 T 900 50 T 1200 50 V90 H0 Z" />
          <path class="w2" d="M0 64 Q 150 30 300 64 T 600 64 T 900 64 T 1200 64 V90 H0 Z" />
        </svg>
      </div>
    </section>

    <footer class="footer">© 2026 心屿 MIND ISLE · 让情绪有处可栖</footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import logoImg from '@/assets/images/logo.png'
import { useFrontAuth } from '@/utils/frontAuth'
import KitButton from '@/components/front/KitButton.vue'
import UserAvatar from '@/components/front/UserAvatar.vue'

const router = useRouter()
const { isLoggedIn, user } = useFrontAuth()

const weekDays = ['一', '二', '三', '四', '五', '六', '日']
const weekBars = [42, 58, 35, 64, 50, 88, 46]
const statBars = [38, 52, 30, 60, 72, 95, 56]

const featureRef = ref(null)
const scrollToFeatures = () => {
  featureRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 滚动入场：.rv 进入视口后加 .in
let io = null
onMounted(() => {
  io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in')
          io.unobserve(e.target)
        }
      })
    },
    { threshold: 0.12 }
  )
  document.querySelectorAll('.landing .rv').forEach((el) => io.observe(el))
})
onBeforeUnmount(() => io?.disconnect())

// 已登录进工作台，未登录去登录页
const enter = () => router.push(isLoggedIn.value ? '/front/dashboard' : '/front/login')
const goLogin = () => router.push('/front/login')
</script>

<style scoped>
/* ============================================================
   落地页强制浅色：在 .landing 作用域内重写设计令牌，
   即使 <html class="dark">，本页也始终保持纸张浅色皮肤
   ============================================================ */
.landing {
  --ink: #1f1f1f;
  --paper: #f6f5f0;
  --card: #ffffff;
  --c-blue: #1a73e8;
  --c-yellow: #fbbc04;
  --c-red: #ea4335;
  --c-green: #34a853;
  --c-purple: #a142f4;
  --c-blue-soft: #e8f0fe;
  --c-yellow-soft: #fef7e0;
  --c-red-soft: #fce8e6;
  --c-green-soft: #e6f4ea;
  --c-purple-soft: #f3e8fd;
  --ink-70: rgba(31, 31, 31, 0.72);
  --ink-55: rgba(31, 31, 31, 0.55);
  --ink-40: rgba(31, 31, 31, 0.4);
  --ink-25: rgba(31, 31, 31, 0.22);
  --hover-bg: #f2f2ef;
  --line: 2px solid var(--ink);
  --radius-card: 24px;
  --radius-pill: 999px;
  --shadow-1: 4px 4px 0 var(--ink);
  --shadow-2: 6px 6px 0 var(--ink);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth: cubic-bezier(0.22, 1, 0.36, 1);

  min-height: 100vh;
  background-color: var(--paper);
  background-image: radial-gradient(var(--ink-25) 1.4px, transparent 1.4px);
  background-size: 26px 26px;
  color: var(--ink);
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  overflow-x: hidden;
}

/* ---------- 滚动入场 ---------- */
.rv {
  opacity: 0;
  transform: translateY(30px);
  transition:
    opacity 0.7s var(--ease-smooth),
    transform 0.7s var(--ease-spring);
  transition-delay: var(--d, 0s);
}
.rv.in {
  opacity: 1;
  transform: none;
}

/* ---------- 顶栏 ---------- */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1160px;
  margin: 0 auto;
  padding: 22px 28px;
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.logo-img {
  width: 40px;
  height: 40px;
  object-fit: contain;
  background: #fff;
  border: var(--line);
  border-radius: 50%;
  box-shadow: 2px 2px 0 var(--ink);
  padding: 4px;
  box-sizing: border-box;
}
.logo-cn {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 3px;
}
.logo-en {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--ink-55);
  border: 2px solid var(--ink-25);
  border-radius: var(--radius-pill);
  padding: 2px 9px;
}
.top-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.top-avatar {
  cursor: pointer;
  box-shadow: 2px 2px 0 var(--ink);
  transition: transform 0.15s var(--ease-spring);
}
.top-avatar:hover { transform: translate(-1px, -1px); }

/* ---------- 主视觉 ---------- */
.hero {
  max-width: 1160px;
  margin: 0 auto;
  padding: 40px 28px 56px;
  display: grid;
  grid-template-columns: 0.92fr 1.08fr;
  gap: 56px;
  align-items: center;
}
.hero-badge {
  display: inline-block;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2px;
  background: var(--c-yellow);
  color: #1f1f1f;
  border: var(--line);
  border-radius: var(--radius-pill);
  padding: 7px 18px;
  box-shadow: 3px 3px 0 var(--ink);
  transform: rotate(-1.5deg);
}
.hero-title {
  margin: 26px 0 6px;
  font-size: clamp(76px, 10vw, 120px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.12em;
}
.hero-slogan {
  margin: 0 0 20px;
  font-size: clamp(20px, 2.4vw, 25px);
  font-weight: 800;
  letter-spacing: 6px;
}
.hero-desc {
  margin: 0 0 32px;
  font-size: 15px;
  line-height: 2.05;
  letter-spacing: 0.5px;
  color: var(--ink-70);
}
.hero-cta {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.cta-main {
  font-size: 16px !important;
  padding: 13px 30px !important;
  border-radius: 16px !important;
  box-shadow: 3px 3px 0 var(--ink) !important;
}
.cta-arrow {
  display: inline-block;
  transition: transform 0.2s var(--ease-spring);
}
:deep(.kit-btn):hover .cta-arrow { transform: translateX(5px); }
.hero-note {
  margin: 18px 0 0;
  font-size: 12.5px;
  letter-spacing: 2px;
  color: var(--ink-40);
}

/* ---------- 产品预览窗口 ---------- */
.hero-visual {
  position: relative;
}
.hv-deco {
  position: absolute;
  z-index: 2;
  pointer-events: none;
  font-weight: 900;
}
.hv-spark {
  color: var(--c-blue);
  text-shadow: 2px 2px 0 var(--ink);
  font-size: 26px;
}
.hv-spark.s1 { top: -8px; left: 40%; transform: rotate(12deg); }
.hv-spark.s2 { bottom: 58px; right: -6px; font-size: 20px; color: var(--c-yellow); transform: rotate(-10deg); }
.hv-cross {
  top: 46%;
  left: -22px;
  font-size: 24px;
  color: var(--c-red);
  text-shadow: 2px 2px 0 var(--ink);
  transform: rotate(8deg);
}

.window {
  position: relative;
  z-index: 1;
  background: var(--card);
  border: var(--line);
  border-radius: 22px;
  box-shadow: 8px 8px 0 var(--ink);
  overflow: hidden;
  transform: rotate(-1.2deg);
}
.win-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: var(--line);
  background: var(--card);
}
.dots {
  display: inline-flex;
  gap: 7px;
}
.dots i {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1.8px solid var(--ink);
}
.d-red { background: var(--c-red); }
.d-yellow { background: var(--c-yellow); }
.d-green { background: var(--c-green); }
.win-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--ink-55);
}
.win-body { padding: 18px; display: flex; flex-direction: column; gap: 14px; }

.win-greet {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.g-hi { margin: 0; font-size: 17px; font-weight: 800; }
.g-date { margin: 3px 0 0; font-size: 12px; color: var(--ink-55); }
.g-mood {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: var(--c-yellow-soft);
  border: var(--line);
  border-radius: 14px;
  box-shadow: 2px 2px 0 var(--ink);
}

.win-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.ws {
  border: var(--line);
  border-radius: 14px;
  padding: 10px 8px;
  text-align: center;
  box-shadow: 2px 2px 0 var(--ink);
}
.ws b { font-size: 20px; font-weight: 900; font-variant-numeric: tabular-nums; }
.ws b em { font-size: 11px; font-style: normal; font-weight: 700; margin-left: 2px; }
.ws span { display: block; margin-top: 2px; font-size: 11px; color: var(--ink-55); }
.ws-blue { background: var(--c-blue-soft); }
.ws-green { background: var(--c-green-soft); }
.ws-yellow { background: var(--c-yellow-soft); }

.win-panel {
  border: var(--line);
  border-radius: 16px;
  padding: 12px 14px;
  background: #fff;
}
.wp-head { display: flex; align-items: center; justify-content: space-between; }
.wp-title { margin: 0 0 10px; font-size: 13px; font-weight: 800; letter-spacing: 1px; }
.wp-trend { font-size: 12px; font-weight: 800; color: var(--c-green); }
.task {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 4px 0;
  font-size: 13px;
}
.task.done span { color: var(--ink-40); text-decoration: line-through; }
.tk {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border: 2px solid var(--ink);
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.tk-green { background: var(--c-green); }
.tk-red { background: var(--c-red-soft); }
.tk-yellow { background: var(--c-yellow-soft); }
.tk svg { width: 11px; height: 11px; fill: none; stroke: #fff; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }

.bars {
  height: 74px;
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.bars i {
  flex: 1;
  background: var(--c-blue-soft);
  border: 1.6px solid var(--ink);
  border-bottom: none;
  border-radius: 6px 6px 0 0;
}
.bars i.on { background: var(--c-blue); }
.bar-labels {
  display: flex;
  gap: 8px;
  margin-top: 5px;
}
.bar-labels span {
  flex: 1;
  text-align: center;
  font-size: 10px;
  color: var(--ink-40);
}

/* 漂浮贴纸 */
.pop {
  position: absolute;
  z-index: 3;
  background: #fff;
  border: var(--line);
  box-shadow: 4px 4px 0 var(--ink);
}
.pop-chat {
  top: 54px;
  right: -26px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 14px;
  border-radius: 16px;
  max-width: 240px;
  transform: rotate(4deg);
}
.pop-tag {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  border: 2px solid var(--ink);
  border-radius: 8px;
  padding: 2px 8px;
}
.tag-blue { background: var(--c-blue); }
.pop-line { font-size: 13px; font-weight: 700; white-space: nowrap; }

.pop-ring {
  left: -30px;
  bottom: 36px;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(-7deg);
  background: var(--c-green-soft);
}
.pop-ring svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.r-track { fill: none; stroke: #fff; stroke-width: 9; }
.r-prog { fill: none; stroke: var(--c-green); stroke-width: 9; stroke-linecap: round; }
.ring-num { font-size: 15px; font-weight: 900; font-variant-numeric: tabular-nums; }
.ring-cap { position: absolute; bottom: 20px; font-size: 9px; font-weight: 700; color: var(--ink-55); }

.pop-mood {
  right: -18px;
  bottom: -16px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 14px;
  border-radius: 16px;
  transform: rotate(-3deg);
}
.mood-emoji {
  font-size: 24px;
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--c-yellow-soft);
  border: 2px solid var(--ink);
  border-radius: 12px;
}
.mood-txt { display: flex; flex-direction: column; line-height: 1.25; }
.mood-txt b { font-size: 14px; }
.mood-txt small { font-size: 10.5px; color: var(--ink-55); }

@media (prefers-reduced-motion: no-preference) {
  .float-a { animation: bob 6s ease-in-out infinite; }
  .float-b { animation: bob 7s ease-in-out 0.7s infinite; }
  .float-c { animation: bob 5.4s ease-in-out 1.3s infinite; }
}
@keyframes bob {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -9px; }
}

/* ---------- 专题区 ---------- */
.topics {
  max-width: 1160px;
  margin: 0 auto;
  padding: 30px 28px 20px;
  scroll-margin-top: 12px;
}
.topics-kicker {
  margin: 30px 0 12px;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 4px;
  color: var(--ink-55);
}
.topics-title {
  margin: 0 0 40px;
  text-align: center;
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 900;
  line-height: 1.35;
  letter-spacing: 2px;
}

.topic {
  --accent: var(--c-blue);
  --accent-soft: var(--c-blue-soft);
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
  padding: 58px 0;
}
.t-blue { --accent: var(--c-blue); --accent-soft: var(--c-blue-soft); }
.t-yellow { --accent: #d99a00; --accent-soft: var(--c-yellow-soft); }
.t-red { --accent: var(--c-red); --accent-soft: var(--c-red-soft); }
.t-green { --accent: var(--c-green); --accent-soft: var(--c-green-soft); }
.t-purple { --accent: var(--c-purple); --accent-soft: var(--c-purple-soft); }

/* mock 通用画框 */
.mock {
  position: relative;
  background: #fff;
  border: var(--line);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-2);
  padding: 26px;
  transition: transform 0.35s var(--ease-smooth), box-shadow 0.35s var(--ease-smooth);
}
.topic-visual .mock { transform: rotate(1.4deg); }
.topic.rev .mock { transform: rotate(-1.4deg); }
.topic-visual:hover .mock {
  transform: rotate(0) translateY(-5px);
  box-shadow: 8px 8px 0 var(--ink);
}

/* 大序号水印 */
.t-no {
  position: absolute;
  top: 6px;
  right: 8%;
  font-size: 150px;
  font-weight: 900;
  line-height: 1;
  color: transparent;
  -webkit-text-stroke: 2.5px var(--ink-25);
  user-select: none;
  pointer-events: none;
  z-index: 0;
}
.t-kick {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 13.5px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: var(--accent);
  margin-bottom: 16px;
}
.t-kick i {
  width: 14px;
  height: 14px;
  border: 2px solid var(--ink);
  background: var(--accent);
  border-radius: 4px;
  box-shadow: 1.5px 1.5px 0 var(--ink);
}
.topic-copy h3 {
  position: relative;
  z-index: 1;
  margin: 0 0 18px;
  font-size: clamp(26px, 3.2vw, 36px);
  font-weight: 900;
  line-height: 1.32;
  letter-spacing: 1.5px;
}
.t-lead {
  position: relative;
  z-index: 1;
  margin: 0 0 22px;
  font-size: 15.5px;
  line-height: 1.95;
  color: var(--ink-70);
}
.t-list {
  position: relative;
  z-index: 1;
  margin: 0 0 28px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 13px;
}
.t-list li {
  display: flex;
  gap: 11px;
  align-items: flex-start;
  font-size: 14px;
  line-height: 1.7;
  color: var(--ink-70);
}
.t-list li b { color: var(--ink); font-weight: 800; }
.li-ico {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  margin-top: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-soft);
  border: 2px solid var(--ink);
  border-radius: 7px;
  box-shadow: 1.5px 1.5px 0 var(--ink);
}
.li-ico svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: var(--accent);
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.t-yellow .li-ico svg { stroke: #b58200; }

/* ---- mock 1：AI 对话 ---- */
.mock-chat {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--c-blue-soft);
}
.bub {
  max-width: 78%;
  border: var(--line);
  border-radius: 16px;
  padding: 10px 14px;
  box-shadow: 2px 2px 0 var(--ink);
}
.bub p { margin: 0; font-size: 13.5px; line-height: 1.6; font-weight: 600; }
.bub-user {
  align-self: flex-end;
  background: var(--c-blue);
  color: #fff;
  border-bottom-right-radius: 6px;
}
.bub-user.short { max-width: 52%; }
.bub-row { display: flex; gap: 9px; align-items: flex-end; }
.bub-ava {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 900;
  background: #fff;
  border: var(--line);
  border-radius: 10px;
}
.bub-ai {
  background: #fff;
  border-bottom-left-radius: 6px;
}
.typing { display: flex; gap: 5px; padding: 13px 14px; }
.typing i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ink-40);
  animation: blink 1.2s infinite;
}
.typing i:nth-child(2) { animation-delay: 0.2s; }
.typing i:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
.chat-input {
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: #fff;
  border: var(--line);
  border-radius: var(--radius-pill);
  padding: 9px 9px 9px 18px;
  box-shadow: 2px 2px 0 var(--ink);
}
.chat-input span { font-size: 13px; color: var(--ink-40); }
.send {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--c-blue);
  border: 2px solid var(--ink);
  border-radius: 50%;
}
.send svg { width: 15px; height: 15px; fill: none; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }

/* ---- mock 2：日记 ---- */
.mock-diary {
  background: var(--c-yellow-soft);
}
.tape {
  position: absolute;
  top: -13px;
  left: 50%;
  translate: -50% 0;
  width: 92px;
  height: 26px;
  background: rgba(251, 188, 4, 0.75);
  border: 1.5px solid var(--ink-25);
  transform: rotate(-2.5deg);
}
.dy-date { margin: 8px 0 2px; font-size: 12px; color: var(--ink-55); font-weight: 700; letter-spacing: 1px; }
.dy-title { margin: 0 0 14px; font-size: 21px; font-weight: 900; }
.dy-moods { display: flex; gap: 9px; margin-bottom: 18px; }
.dy-moods span {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: #fff;
  border: var(--line);
  border-radius: 13px;
  box-shadow: 2px 2px 0 var(--ink);
}
.dy-moods span.sel {
  background: var(--c-yellow);
  transform: translateY(-4px) rotate(-3deg);
  box-shadow: 3px 3px 0 var(--ink);
}
.dy-lines { display: flex; flex-direction: column; gap: 12px; padding-bottom: 6px; }
.dy-lines i {
  height: 9px;
  border-radius: var(--radius-pill);
  background: rgba(31, 31, 31, 0.16);
}
.dy-foot {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 2px dashed var(--ink-25);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}
.dy-polaroid {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: #fff;
  border: var(--line);
  box-shadow: 2px 2px 0 var(--ink);
  border-radius: 10px;
  padding: 8px 12px 6px;
  transform: rotate(-2deg);
}
.dy-polaroid b { font-size: 26px; line-height: 1; }
.dy-polaroid small { font-size: 10px; color: var(--ink-55); font-weight: 700; }
.dy-save { font-size: 12px; font-weight: 800; color: #b58200; padding-bottom: 8px; }

/* ---- mock 3：四象限 ---- */
.mx-title { margin: 0 0 14px; font-size: 15px; font-weight: 900; letter-spacing: 1px; }
.mx-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.mx-cell {
  border: var(--line);
  border-radius: 14px;
  padding: 11px;
  min-height: 118px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.mx-red { background: var(--c-red-soft); }
.mx-green { background: var(--c-green-soft); }
.mx-yellow { background: var(--c-yellow-soft); }
.mx-blue { background: var(--c-blue-soft); }
.mx-k {
  font-size: 10.5px;
  font-weight: 900;
  letter-spacing: 0.5px;
  color: var(--ink-55);
}
.mx-k span { margin: 0 2px; }
.mx-chip {
  font-style: normal;
  font-size: 12px;
  font-weight: 700;
  background: #fff;
  border: 1.8px solid var(--ink);
  border-radius: 9px;
  padding: 5px 9px;
  box-shadow: 1.5px 1.5px 0 var(--ink);
  width: fit-content;
}
.mx-chip.c-red { background: var(--c-red); color: #fff; }
.mx-chip.c-green { background: var(--c-green); color: #fff; }
.mx-chip.c-yellow { background: var(--c-yellow); color: #1f1f1f; }
.mx-chip.c-blue { background: var(--c-blue); color: #fff; }

/* ---- mock 4：专注环 ---- */
.mock-focus {
  background: var(--c-green-soft);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.fc-ring { position: relative; width: 200px; height: 200px; }
.fc-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.fc-track { fill: none; stroke: #fff; stroke-width: 13; }
.fc-prog { fill: none; stroke: var(--c-green); stroke-width: 13; stroke-linecap: round; }
.fc-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.fc-center b { font-size: 40px; font-weight: 900; font-variant-numeric: tabular-nums; }
.fc-center span { font-size: 12px; font-weight: 700; color: var(--ink-55); letter-spacing: 2px; }
.fc-dots { display: flex; gap: 8px; }
.fc-dots i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--ink);
  background: #fff;
}
.fc-dots i.on { background: var(--c-green); }
.fc-seed { margin: 0; font-size: 13px; font-weight: 700; color: var(--ink-70); }
.fc-actions { display: flex; gap: 10px; }
.fc-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 800;
  border: var(--line);
  border-radius: var(--radius-pill);
  padding: 8px 20px;
  background: #fff;
  box-shadow: 2px 2px 0 var(--ink);
}
.fc-btn svg { width: 11px; height: 11px; fill: var(--ink); }
.fc-btn.primary { background: var(--c-green); color: #fff; }
.fc-btn.primary svg { fill: #fff; }

/* ---- mock 5：数据 ---- */
.mock-stats { background: var(--c-purple-soft); }
.st-row { display: grid; grid-template-columns: 1.25fr 0.9fr; gap: 18px; align-items: center; }
.st-title { margin: 0 0 12px; font-size: 13px; font-weight: 800; }
.st-title b { float: right; font-size: 16px; font-weight: 900; }
.st-chart {
  height: 120px;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px;
  background: #fff;
  border: var(--line);
  border-radius: 14px;
  box-shadow: 2px 2px 0 var(--ink);
}
.st-chart i {
  flex: 1;
  background: #e9dbfb;
  border: 1.5px solid var(--ink);
  border-bottom: none;
  border-radius: 5px 5px 0 0;
}
.st-chart i.on { background: var(--c-purple); }
.st-bars .bar-labels span { color: var(--ink-55); }
.st-donut { position: relative; display: flex; justify-content: center; }
.st-donut svg { width: 150px; height: 150px; transform: rotate(-90deg); }
.st-donut circle { fill: none; stroke-width: 13; }
.dn-track { stroke: #fff; }
.st-donut b {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 900;
}
.st-legend {
  margin: 16px 0 0;
  padding: 14px 0 0;
  border-top: 2px dashed var(--ink-25);
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 18px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-70);
}
.st-legend li { display: flex; align-items: center; gap: 8px; }
.st-legend i {
  width: 11px;
  height: 11px;
  border: 1.8px solid var(--ink);
  border-radius: 4px;
}
.st-legend b { margin-left: auto; font-weight: 900; color: var(--ink); }

/* ---------- 结尾 CTA ---------- */
.closing {
  max-width: 1160px;
  margin: 56px auto 0;
  padding: 0 28px;
}
.closing-card {
  position: relative;
  overflow: hidden;
  background: var(--c-blue);
  border: var(--line);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-2);
  padding: 64px 32px 84px;
  text-align: center;
  color: #fff;
}
.cl-moon {
  position: absolute;
  top: 26px;
  right: 48px;
  font-size: 52px;
  line-height: 1;
  opacity: 0.9;
}
.closing-card h2 {
  margin: 0 0 10px;
  font-size: clamp(24px, 3.4vw, 34px);
  font-weight: 900;
  letter-spacing: 2px;
}
.closing-card p {
  margin: 0 0 28px;
  font-size: 15px;
  letter-spacing: 1px;
  opacity: 0.92;
}
.closing-card :deep(.kit-btn) {
  font-size: 16px;
  padding: 13px 32px;
  border-radius: 16px;
}
.cl-wave {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 56px;
}
.cl-wave path { fill: rgba(255, 255, 255, 0.18); }
.cl-wave path.w2 { fill: rgba(255, 255, 255, 0.32); }

/* ---------- 页脚 ---------- */
.footer {
  text-align: center;
  padding: 28px 0 34px;
  font-size: 12px;
  letter-spacing: 2px;
  color: var(--ink-40);
}

/* ---------- 响应式 ---------- */
@media (max-width: 960px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 40px;
    padding-top: 20px;
  }
  .hero-text { text-align: center; }
  .hero-cta { justify-content: center; }
  .hero-note { text-align: center; }
  .topic {
    grid-template-columns: 1fr;
    gap: 30px;
    padding: 44px 0;
  }
  .topic.rev .topic-visual { order: 0; }
  .t-no { right: 0; font-size: 110px; }
  .top-enter { display: none; }
  .pop-chat { right: -8px; }
  .pop-ring { left: -10px; }
}
@media (max-width: 560px) {
  .logo-en { display: none; }
  .st-row { grid-template-columns: 1fr; }
  .st-donut svg { width: 130px; height: 130px; }
  .cl-moon { font-size: 38px; right: 24px; }
  .bub-user { max-width: 92%; }
}

@media (prefers-reduced-motion: reduce) {
  .rv { opacity: 1; transform: none; transition: none; }
  .float-a, .float-b, .float-c, .typing i { animation: none; }
}
</style>
