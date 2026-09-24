import { createApp } from 'vue'
import './style.css'
import './styles/tokens.css'
import './utils/theme' // 夜间模式：尽早应用 html.dark，避免刷新闪白
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css' // 夜间模式：el 组件随 html.dark 自动变暗
import router from './router'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { createPinia } from 'pinia'

const pinia = createPinia()
const app = createApp(App)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
app.use(ElementPlus).use(pinia).use(router).mount('#app')
