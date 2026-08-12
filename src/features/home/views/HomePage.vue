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
import ReanalysisFloating from '@/features/tendency/components/ReanalysisFloating.vue'
import { useTendencyStore } from '@/features/tendency/stores/tendencyStore'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'

const REANALYSIS_NOTICE_COLLAPSED_KEY = 'investory:reanalysis-notice-collapsed:v8'

const router = useRouter()
const homeStore = useHomeStore()
const tendencyStore = useTendencyStore()
const reanalysisNoticeCollapsed = ref(true)
let reanalysisMidnightTimer

const journalRoute = {
  name: ROUTE_NAMES.JOURNAL_CREATE,
  query: { from: 'home' },
}
const tendencyRoute = { name: ROUTE_NAMES.TENDENCY }
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
    brokerName: firstAccount.brokerName,
    accountCount: homeStore.accounts.length,
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
    tendencyStore.fetchLatestAnalysis(),
  ])
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
      <div class="home-page__hero">
        <HomeHeader logo-src="/assets/logos/investory-logo-dark.png" dark />
        <TodayRecordHero :today="liveToday" @open-transactions="openTransactions" />
      </div>

      <HomeConnectionSummary
        v-if="connectedAssetSummary"
        :broker-name="connectedAssetSummary.brokerName"
        :account-count="connectedAssetSummary.accountCount"
        :holding-count="connectedAssetSummary.holdingCount"
        :total-valuation="connectedAssetSummary.totalValuation"
      />

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
  background: #ffffff;
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
  right: max(16px, calc((100vw - 390px) / 2 + 16px));
  bottom: calc(var(--mobile-frame-edge-offset, 0px) + 84px);
  display: flex;
  width: min(calc(100% - 32px), 358px);
  flex-direction: column;
}
</style>
