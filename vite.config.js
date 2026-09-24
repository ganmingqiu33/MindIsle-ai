import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 第三个参数传 ''：同时读取不带 VITE_ 前缀的变量（如 DIFY_API_KEY，仅服务端使用）
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
      }),
      Components({
        resolvers: [ElementPlusResolver()],
      }),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      proxy: {
        // 把前端发出的 /api 开头请求，代理转发到 Apifox Mock 地址
        '/api': {
          target: env.VITE_API_TARGET,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        // 用户认证服务：浏览器请求 /auth-svc/xxx → http://127.0.0.1:3002/xxx
        // （注册/登录/改密/管理员用户列表/发邮件）
        // 注意：不能用 /auth 作前缀，否则会误匹配 /author 后台登录路由
        '/auth-svc': {
          target: 'http://127.0.0.1:3002',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/auth-svc/, ''),
        },
        // 本地 Ollama：浏览器请求 /ollama/xxx → http://127.0.0.1:11434/xxx
        '/ollama': {
          target: 'http://127.0.0.1:11434',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ollama/, ''),
        },
        // Dify：浏览器请求 /dify/xxx → Dify 服务（密钥在服务端注入，浏览器端不可见）
        '/dify': {
          target: env.DIFY_BASE_URL || 'http://127.0.0.1:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/dify/, ''),
          headers: env.DIFY_API_KEY
            ? { Authorization: `Bearer ${env.DIFY_API_KEY}` }
            : undefined,
          configure: (proxy) => {
            proxy.on('error', (err, req) => {
              console.log(`[dify-proxy] ERROR ${req?.url}: ${err.code} ${err.message}`)
            })
            proxy.on('proxyRes', (proxyRes, req) => {
              console.log(`[dify-proxy] ${req.method} ${req.url} -> ${proxyRes.statusCode} ${proxyRes.headers['content-type']}`)
              proxyRes.on('close', () => console.log(`[dify-proxy] upstream CLOSED ${req.url}`))
            })
            proxy.on('close', (_req, _socket, upstream) => {
              console.log(`[dify-proxy] client closed (upstreamConnected=${!!upstream?.connection})`)
            })
          },
        },
      },
    },
  }
})
