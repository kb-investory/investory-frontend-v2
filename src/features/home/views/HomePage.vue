<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import HomeConnectionSummary from '@/features/home/components/HomeConnectionSummary.vue'
import HomeHeader from '@/features/home/components/HomeHeader.vue'
import HomeQuickActions from '@/features/home/components/HomeQuickActions.vue'
import HomeSimulationCard from '@/features/home/components/HomeSimulationCard.vue'
import TodayRecordHero from '@/features/home/components/TodayRecordHero.vue'
import WeeklyRecordRhythm from '@/features/home/components/WeeklyRecordRhythm.vue'
import { useHomeClock } from '@/features/home/composables/useHomeClock'
import { useHomeStore } from '@/features/home/stores/homeStore'
import { useBrokerConnectionStore } from '@/features/mypage/stores/brokerConnectionStore'
import ReanalysisFloating from '@/features/tendency/components/ReanalysisFloating.vue'
import { useTendencyStore } from '@/features/tendency/stores/tendencyStore'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'

const REANALYSIS_NOTICE_COLLAPSED_KEY = 'investory:reanalysis-notice-collapsed:v3'

const router = useRouter()
const homeStore = useHomeStore()
const brokerStore = useBrokerConnectionStore()
const tendencyStore = useTendencyStore()
const reanalysisNoticeCollapsed = ref(true)
let reanalysisMidnightTimer

const journalRoute = { name: ROUTE_NAMES.JOURNAL_CREATE }
const tendencyRoute = { name: ROUTE_NAMES.TENDENCY }
const simulationRoute = { name: ROUTE_NAMES.SIMULATION }
const { dateLabel, currentTime, remainingTime, dayProgressPercent } = useHomeClock()

const liveToday = computed(() => ({
  ...homeStore.dashboard?.today,
  currentTime: currentTime.value,
  remainingTime: remainingTime.value,
  dayProgressPercent: dayProgressPercent.value,
}))

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

    reanalysisNoticeCollapsed.value =
      window.localStorage.getItem(`${REANALYSIS_NOTICE_COLLAPSED_KEY}:${analysisRunId}`) !== 'false'
  },
  { immediate: true },
)

onMounted(async () => {
  await Promise.allSettled([homeStore.fetchDashboard(), tendencyStore.fetchTendencies()])
  tendencyStore.refreshAnalysisDate()
  scheduleMidnightRefresh()
})

onBeforeUnmount(() => {
  window.clearTimeout(reanalysisMidnightTimer)
})

function openTransactions() {
  router.push(journalRoute)
}
</script>

<template>
  <div class="home-page">
    <div v-if="homeStore.dashboard" class="home-page__content">
      <HomeHeader logo-src="/assets/logos/investory-logo-transparent.png" :date-label="dateLabel" />

      <HomeConnectionSummary
        v-if="brokerStore.connectionCompleted && brokerStore.account"
        :broker-name="brokerStore.account.brokerName"
        :account-count="brokerStore.account.accountCount"
        :holding-count="brokerStore.holdings.length"
        :total-valuation="brokerStore.totalValuation"
      />

      <TodayRecordHero :today="liveToday" @open-transactions="openTransactions" />

      <HomeQuickActions
        :journal-to="journalRoute"
        :tendency-to="tendencyRoute"
        :journal-status="homeStore.dashboard.quickActions.journalStatus"
        :tendency-progress="homeStore.dashboard.quickActions.tendencyProgress"
      />

      <HomeSimulationCard :to="simulationRoute" />

      <WeeklyRecordRhythm :weekly="homeStore.dashboard.weekly" />
    </div>

    <div v-else-if="homeStore.loading" class="home-page__loading">
      <BaseLoading />
    </div>

    <p v-else class="home-page__error">홈 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>

    <div v-if="tendencyStore.shouldShowReanalysis" class="home-page__reanalysis-floating">
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
  background: #ffffff;
}

.home-page__content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 20px 16px;
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
  right: max(16px, calc((100vw - 390px) / 2 + 16px));
  bottom: calc(var(--mobile-frame-edge-offset, 0px) + 84px);
  display: flex;
  width: min(calc(100% - 32px), 358px);
  flex-direction: column;
}
</style>
