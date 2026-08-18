import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const javaBackendUrl = env.VITE_API_TARGET_URL || 'http://localhost:8080/api/v1'
  const pythonAiUrl = env.VITE_AI_TARGET_URL || 'http://localhost:8000'
  const bypassPageNavigation = (request) =>
    request.headers.accept?.includes('text/html') ? '/index.html' : undefined

  return {
    plugins: [vue(), vueDevTools()],
    server: {
      proxy: {
        // 파이썬 로컬 AI 서버 전용 엔드포인트
        '^/api/v1/(simulations|simulation-bots)': {
          target: pythonAiUrl,
          changeOrigin: true,
        },
        // 자바 코어 백엔드 서버 도메인 경로
        '^/(auth|broker|journal|ledger|market|markets|tendency)': {
          target: javaBackendUrl,
          changeOrigin: true,
          secure: false,
          bypass: bypassPageNavigation,
        },
        // 자바 코어 백엔드 서버 (/api 프리픽스 경로)
        '/api': {
          target: javaBackendUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
