<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import BottomTabBar from '@/shared/components/navigation/BottomTabBar.vue'

const route = useRoute()

// UI Kit 화면은 카탈로그 전체 너비로 표시
const isUIKit = computed(() => route.name === ROUTE_NAMES.UI_KIT)
const isFullBleedLayout = computed(() => route.meta.layout === 'full-bleed')
const frameStyle = computed(() => ({
  '--mobile-frame-max-height': `${route.meta.frameHeight ?? 844}px`,
  '--mobile-main-bottom-padding': `${route.meta.mainBottomPadding ?? 84}px`,
}))

const tabItems = [
  { label: '홈', icon: 'house', to: { name: ROUTE_NAMES.HOME } },
  { label: '일지', icon: 'book-open', to: { name: ROUTE_NAMES.JOURNAL } },
  { label: '투자 성향', icon: 'radar', to: { name: ROUTE_NAMES.TENDENCY } },
  { label: '시뮬레이션', isMonkey: true, to: { name: ROUTE_NAMES.SIMULATION } },
  { label: '마이', icon: 'user', to: { name: ROUTE_NAMES.MYPAGE } },
]
</script>

<template>
  <div v-if="isUIKit" class="full-view-layout">
    <RouterView />
  </div>

  <div v-else class="mobile-viewport-shell">
    <div
      class="mobile-frame"
      :class="{ 'mobile-frame--full-bleed': isFullBleedLayout }"
      :style="frameStyle"
    >
      <!-- 동적 세로 스크롤 영역 -->
      <main class="mobile-main" :class="{ 'mobile-main--full-bleed': isFullBleedLayout }">
        <RouterView />
      </main>

      <!-- 뷰포트 하단 고정 내비게이션 -->
      <footer class="mobile-footer" :class="{ 'mobile-footer--full-bleed': isFullBleedLayout }">
        <BottomTabBar :items="tabItems" />
      </footer>
    </div>
  </div>
</template>

<style scoped>
.full-view-layout {
  width: 100%;
  min-height: 100dvh;
}

.mobile-viewport-shell {
  display: flex;
  min-height: 100dvh;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
  background: #eef2f3;
}

.mobile-frame {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 390px;
  height: 100dvh;
  max-height: var(--mobile-frame-max-height);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-default, #e5e5e0);
  border-radius: 24px;
  background: var(--bg-primary, #f6f4ef);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.12);
}

.mobile-frame--full-bleed {
  background: #ffffff;
}

.mobile-main {
  width: 100%;
  flex: 1 1 0;
  padding: 20px 20px 84px 20px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.mobile-main--full-bleed {
  padding: 0 0 var(--mobile-main-bottom-padding);
}

.mobile-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 8px 16px 12px 16px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  z-index: 100;
}

.mobile-footer--full-bleed {
  padding-bottom: 16px;
}

@media (max-width: 440px) {
  .mobile-viewport-shell {
    padding: 0;
    background: var(--bg-primary, #f6f4ef);
  }

  .mobile-frame {
    max-width: 100%;
    height: 100dvh;
    max-height: 100dvh;
    border: none;
    border-radius: 0;
    box-shadow: none;
  }
}
</style>
