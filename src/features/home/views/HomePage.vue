<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import HomeHeader from '@/features/home/components/HomeHeader.vue'
import HomeQuickActions from '@/features/home/components/HomeQuickActions.vue'
import HomeSimulationCard from '@/features/home/components/HomeSimulationCard.vue'
import TodayRecordHero from '@/features/home/components/TodayRecordHero.vue'
import WeeklyRecordRhythm from '@/features/home/components/WeeklyRecordRhythm.vue'
import { useHomeStore } from '@/features/home/stores/homeStore'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'

const router = useRouter()
const homeStore = useHomeStore()

const journalRoute = { name: ROUTE_NAMES.JOURNAL_CREATE }
const tendencyRoute = { name: ROUTE_NAMES.TENDENCY }
const simulationRoute = { name: ROUTE_NAMES.SIMULATION }

onMounted(() => homeStore.fetchDashboard())

function openTransactions() {
  router.push(journalRoute)
}

function openSearch() {
  router.push({ name: ROUTE_NAMES.JOURNAL })
}
</script>

<template>
  <div class="home-page">
    <div v-if="homeStore.dashboard" class="home-page__content">
      <HomeHeader
        logo-src="/assets/logos/investory-logo.png"
        :date-label="homeStore.dashboard.dateLabel"
        @search="openSearch"
      />

      <TodayRecordHero :today="homeStore.dashboard.today" @open-transactions="openTransactions" />

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
  font-size: 13px;
  text-align: center;
}
</style>
