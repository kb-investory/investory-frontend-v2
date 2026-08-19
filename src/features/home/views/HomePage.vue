<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import HomeHeader from '@/features/home/components/HomeHeader.vue'
import HomeQuickActions from '@/features/home/components/HomeQuickActions.vue'
import HomeSimulationCard from '@/features/home/components/HomeSimulationCard.vue'
import TodayRecordHero from '@/features/home/components/TodayRecordHero.vue'
import WeeklyRecordRhythm from '@/features/home/components/WeeklyRecordRhythm.vue'
import { useHomeClock } from '@/features/home/composables/useHomeClock'
import { useHomeStore } from '@/features/home/stores/homeStore'
import { useMypageStore } from '@/features/mypage/stores/mypageStore'
import { useNotificationStore } from '@/features/notifications/stores/notificationStore'
import ReanalysisFloating from '@/features/tendency/components/ReanalysisFloating.vue'
import { useFloatingCornerSwipe } from '@/features/tendency/composables/useFloatingCornerSwipe'
import { useTendencyStore } from '@/features/tendency/stores/tendencyStore'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'

const REANALYSIS_NOTICE_COLLAPSED_KEY = 'investory:reanalysis-notice-collapsed:v8'
const HOME_FLOATING_POSITION_KEY = 'investory:home-floating-position:v1'

const router = useRouter()
const homeStore = useHomeStore()
const mypageStore = useMypageStore()
const notificationStore = useNotificationStore()
const tendencyStore = useTendencyStore()
const reanalysisNoticeCollapsed = ref(true)
const syncingHome = ref(false)
const {
  elementRef: reanalysisFloatingRef,
  position: reanalysisFloatingPosition,
  sliding: reanalysisFloatingSliding,
  style: reanalysisFloatingStyle,
  startSwipe: startReanalysisSwipe,
  preventClickAfterSwipe: preventReanalysisClick,
} = useFloatingCornerSwipe(HOME_FLOATING_POSITION_KEY)
let reanalysisMidnightTimer
let notificationClockTimer

const journalRoute = {
  name: ROUTE_NAMES.JOURNAL_CREATE,
  query: { from: 'home' },
}
const principleRoute = { name: ROUTE_NAMES.TENDENCY, query: { tab: 'principles' } }
const simulationRoute = { name: ROUTE_NAMES.SIMULATION }
const { currentTime, remainingTime, dayProgressPercent } = useHomeClock()

const liveToday = computed(() => ({
  ...homeStore.dashboard?.today,
  currentTime: currentTime.value,
  remainingTime: remainingTime.value,
  dayProgressPercent: dayProgressPercent.value,
}))
const connectedAssetSummary = computed(() => {
  const firstAccount = homeStore.accounts[0]
  if (!firstAccount || !homeStore.summary) return null

  return {
    accountName: firstAccount.accountName || firstAccount.brokerName,
    holdingCount: homeStore.holdings.length,
    totalValuation: homeStore.summary.totalMarketValue,
  }
})

function toggleReanalysisNotice() {
  const analysisRunId = tendencyStore.analysis?.analysisRunId
  if (!analysisRunId) return

  reanalysisNoticeCollapsed.value = !reanalysisNoticeCollapsed.value
  window.localStorage.setItem(
    `${REANALYSIS_NOTICE_COLLAPSED_KEY}:${analysisRunId}`,
    String(reanalysisNoticeCollapsed.value),
  )
}

function openTendencyReanalysis() {
  router.push({
    name: ROUTE_NAMES.TENDENCY,
    query: { reanalyze: 'true' },
  })
}

function openNotifications() {
  router.push({ name: ROUTE_NAMES.NOTIFICATIONS })
}

async function syncHome() {
  if (syncingHome.value) return

  syncingHome.value = true
  try {
    // 연결 계좌를 먼저 증권사와 동기화해 새 거래를 적재한 뒤 화면 데이터를 다시 읽는다.
    // 동기화 실패는 mypageStore가 자체적으로 흡수하므로 홈 새로고침 자체는 계속 진행된다.
    await mypageStore.syncAllAccounts()
    await Promise.allSettled([
      homeStore.fetchDashboard({ force: true }),
      homeStore.fetchSummary({ force: true }),
      notificationStore.fetchNotifications(),
      tendencyStore.fetchLatestAnalysis({ force: true }),
    ])
    tendencyStore.refreshAnalysisDate()
  } finally {
    syncingHome.value = false
  }
}

function scheduleMidnightRefresh() {
  const now = new Date()
  const nextMidnight = new Date(now)
  nextMidnight.setHours(24, 0, 0, 0)

  reanalysisMidnightTimer = window.setTimeout(() => {
    tendencyStore.refreshAnalysisDate()
    scheduleMidnightRefresh()
  }, nextMidnight.getTime() - now.getTime())
}

watch(
  () => tendencyStore.analysis?.analysisRunId,
  (analysisRunId) => {
    if (!analysisRunId) {
      reanalysisNoticeCollapsed.value = true
      return
    }

    const storedCollapsedState = window.localStorage.getItem(
      `${REANALYSIS_NOTICE_COLLAPSED_KEY}:${analysisRunId}`,
    )
    reanalysisNoticeCollapsed.value =
      storedCollapsedState === null ? false : storedCollapsedState !== 'false'
  },
  { immediate: true },
)

onMounted(async () => {
  await Promise.allSettled([
    homeStore.fetchDashboard(),
    homeStore.fetchSummary(),
    notificationStore.fetchNotifications(),
    tendencyStore.fetchLatestAnalysis(),
  ])
  tendencyStore.refreshAnalysisDate()
  scheduleMidnightRefresh()
  notificationClockTimer = window.setInterval(() => {
    void notificationStore.refreshForCurrentTime()
  }, 60 * 1000)
})

onBeforeUnmount(() => {
  window.clearTimeout(reanalysisMidnightTimer)
  window.clearInterval(notificationClockTimer)
})
</script>

<template>
  <div class="home-page">
    <div v-if="homeStore.dashboard" class="home-page__content">
      <div class="home-page__hero">
        <HomeHeader
          logo-src="/assets/logos/investory-logo-dark.png"
          dark
          :notification-count="notificationStore.unreadCount"
          :syncing="syncingHome"
          @notification="openNotifications"
          @sync="syncHome"
        />
        <TodayRecordHero :today="liveToday" :asset-summary="connectedAssetSummary" />
      </div>

      <HomeQuickActions
        :journal-to="journalRoute"
        :principle-to="principleRoute"
        :journal-status="homeStore.dashboard.quickActions.journalStatus"
      />

      <HomeSimulationCard :to="simulationRoute" />

      <WeeklyRecordRhythm :weekly="homeStore.dashboard.weekly" />
    </div>

    <div v-else-if="homeStore.loading" class="home-page__loading">
      <BaseLoading />
    </div>

    <p v-else class="home-page__error">홈 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>

    <div
      v-if="tendencyStore.shouldShowReanalysis"
      ref="reanalysisFloatingRef"
      class="home-page__reanalysis-floating"
      :class="[
        `home-page__reanalysis-floating--${reanalysisFloatingPosition}`,
        { 'home-page__reanalysis-floating--sliding': reanalysisFloatingSliding },
      ]"
      :style="reanalysisFloatingStyle"
      @pointerdown="startReanalysisSwipe"
      @click.capture="preventReanalysisClick"
    >
      <ReanalysisFloating
        :collapsed="reanalysisNoticeCollapsed"
        @analyze="openTendencyReanalysis"
        @toggle="toggleReanalysisNotice"
      />
    </div>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100%;
  background: linear-gradient(180deg, #f4f8f8 0%, #ffffff 42%);
}

.home-page__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 16px 24px;
}

.home-page__hero {
  overflow: hidden;
  width: calc(100% + 32px);
  margin: 0 -16px;
  border-radius: 0 0 30px 30px;
  background:
    radial-gradient(
      circle at 82% 44%,
      transparent 0 64px,
      rgba(39, 211, 205, 0.09) 65px 66px,
      transparent 67px 94px,
      rgba(39, 211, 205, 0.06) 95px 96px,
      transparent 97px
    ),
    radial-gradient(circle at 80% 58%, rgba(16, 198, 193, 0.16), transparent 42%), #032832;
  box-shadow: 0 14px 30px rgba(31, 58, 67, 0.1);
}

.home-page__loading {
  display: flex;
  min-height: 500px;
  align-items: center;
  justify-content: center;
}

.home-page__error {
  margin: 40px 20px;
  color: #718087;
  font-size: var(--font-size-body);
  text-align: center;
}

.home-page__reanalysis-floating {
  position: fixed;
  z-index: 160;
  display: flex;
  width: 220px;
  flex-direction: column;
  touch-action: none;
  user-select: none;
  transition: none;
}

.home-page__reanalysis-floating--sliding {
  transition: transform 0.28s cubic-bezier(0.22, 0.8, 0.3, 1);
}

.home-page__reanalysis-floating--top-left,
.home-page__reanalysis-floating--bottom-left {
  left: max(16px, calc((100vw - 390px) / 2 + 16px));
  align-items: flex-start;
}

.home-page__reanalysis-floating--top-right,
.home-page__reanalysis-floating--bottom-right {
  right: max(16px, calc((100vw - 390px) / 2 + 16px));
  align-items: flex-end;
}

.home-page__reanalysis-floating--top-left,
.home-page__reanalysis-floating--top-right {
  top: calc(var(--mobile-frame-edge-offset, 0px) + 76px);
}

.home-page__reanalysis-floating--bottom-left,
.home-page__reanalysis-floating--bottom-right {
  bottom: calc(var(--mobile-frame-edge-offset, 0px) + 84px);
}

.home-page__reanalysis-floating :deep(.recommendation-floating--collapsed) {
  align-self: auto;
}
</style>
