import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const javaBackendUrl = env.VITE_API_TARGET_URL || 'http://localhost:8080/api/v1'
  const pythonAiUrl = env.VITE_AI_TARGET_URL || 'http://localhost:8000'
  const bypassPageNavigation = (request) =>
    request.headers.accept?.includes('text/html') ? '/index.html' : undefined

  return {
    plugins: [
      vue(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'Investory',
          short_name: 'Investory',
          description: '투자 기록을 원칙과 인사이트로 연결하는 투자 관리 서비스',
          lang: 'ko-KR',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait-primary',
          theme_color: '#087f7c',
          background_color: '#f6f4ef',
          categories: ['finance', 'productivity'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [
            /^\/api\//,
            /^\/(auth|broker|journal|ledger|market|markets|tendency)(\/|$)/,
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
      vueDevTools(),
    ],
    server: {
      proxy: {
        // 파이썬 로컬 AI 서버 전용 엔드포인트 (시뮬레이션/봇/원칙 전부 /api/simulation 하위)
        '^/api/simulation': {
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
