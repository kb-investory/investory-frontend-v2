<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import BottomTabBar from '@/shared/components/navigation/BottomTabBar.vue'

const route = useRoute()

// UI Kit 화면은 카탈로그 전체 너비로 표시
const isUIKit = computed(() => route.name === ROUTE_NAMES.UI_KIT)
const isBlankLayout = computed(() => route.meta.layout === 'blank')
const isFullBleedLayout = computed(() => route.meta.layout === 'full-bleed')
const hideBottomNav = computed(() => route.meta.hideBottomNav === true)
const frameStyle = computed(() => ({
  '--mobile-frame-max-height': `${route.meta.frameHeight ?? 844}px`,
  '--mobile-main-bottom-padding': `${route.meta.mainBottomPadding ?? 84}px`,
  '--mobile-frame-background': route.meta.frameBackground ?? '#ffffff',
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

  <div v-else-if="isBlankLayout" class="full-view-layout full-view-layout--blank">
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
      <footer
        v-if="!hideBottomNav"
        class="mobile-footer"
        :class="{ 'mobile-footer--full-bleed': isFullBleedLayout }"
      >
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

.full-view-layout--blank {
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
  overscroll-behavior: none;
}

.mobile-viewport-shell {
  --app-frame-inline-size: min(390px, 100vw);
  --app-content-inline-size: var(--app-frame-inline-size);

  display: flex;
  height: 100dvh;
  min-height: 100dvh;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 16px;
  background: #eef2f3;
}

.mobile-frame {
  --mobile-frame-edge-offset: max(16px, calc((100dvh - 844px) / 2));

  position: relative;
  display: flex;
  width: var(--app-frame-inline-size);
  height: calc(100dvh - 32px);
  max-height: var(--mobile-frame-max-height);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-default, #e5e5e0);
  border-radius: 24px;
  background: var(--bg-primary, #f6f4ef);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.12);
}

.mobile-frame--full-bleed {
  background: var(--mobile-frame-background, #ffffff);
}

.mobile-main {
  width: 100%;
  flex: 1 1 0;
  padding: 20px 20px 84px 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
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
  background: transparent;
  pointer-events: none;
  z-index: 100;
}

.mobile-footer--full-bleed {
  padding-bottom: 16px;
}

@media (max-width: 440px) {
  .mobile-viewport-shell {
    --app-frame-inline-size: 100vw;
    --app-content-inline-size: 100vw;

    padding: 0;
    background: var(--bg-primary, #f6f4ef);
  }

  .mobile-frame {
    --mobile-frame-edge-offset: 0px;

    width: 100%;
    height: 100dvh;
    max-height: 100dvh;
    border: none;
    border-radius: 0;
    box-shadow: none;
  }
}

@media (min-width: 441px) and (max-width: 767px) {
  .mobile-viewport-shell {
    --app-frame-inline-size: min(560px, calc(100vw - 32px));
    --app-content-inline-size: var(--app-frame-inline-size);
  }
}

@media (min-width: 768px) {
  .mobile-viewport-shell {
    --app-frame-inline-size: min(720px, calc(100vw - 48px));
    --app-content-inline-size: var(--app-frame-inline-size);

    padding: 24px;
  }

  .mobile-frame {
    --mobile-frame-edge-offset: 24px;

    height: calc(100dvh - 48px);
    max-height: none;
    border-radius: 28px;
  }

  .mobile-main:not(.mobile-main--full-bleed) {
    padding-right: 28px;
    padding-left: 28px;
  }

  .mobile-footer {
    padding-right: 24px;
    padding-left: 24px;
  }
}

@media (min-width: 1200px) {
  .mobile-viewport-shell {
    --app-frame-inline-size: min(1040px, calc(100vw - 64px));
    --app-content-inline-size: min(840px, calc(100vw - 96px));

    padding: 32px;
  }

  .mobile-frame {
    --mobile-frame-edge-offset: 32px;

    height: calc(100dvh - 64px);
  }
}
</style>
