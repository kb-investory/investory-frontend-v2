<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import SimulationFlowHeader from '@/features/simulation/components/SimulationFlowHeader.vue'
import SimulationResultSummary from '@/features/simulation/components/SimulationResultSummary.vue'
import { getSimulationDetail, getSimulationReport } from '@/features/simulation/api/simulationApi'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'

const route = useRoute()
const router = useRouter()

const simulationResult = ref(null)
const simulationReport = ref(null)
const loading = ref(true)
const reportLoading = ref(false)
const error = ref(null)
const reportError = ref(null)

onMounted(async () => {
  const simulationId = route.params.simulationId
  loading.value = true
  reportLoading.value = true
  error.value = null
  reportError.value = null

  await Promise.all([
    getSimulationDetail(simulationId)
      .then((result) => {
        simulationResult.value = result
      })
      .catch((requestError) => {
        error.value = requestError
      })
      .finally(() => {
        loading.value = false
      }),
    getSimulationReport(simulationId)
      .then((report) => {
        simulationReport.value = report
      })
      .catch((requestError) => {
        reportError.value = requestError
      })
      .finally(() => {
        reportLoading.value = false
      }),
  ])
})

function goBack() {
  router.push({ name: ROUTE_NAMES.MYPAGE })
}

function restartSimulation() {
  router.push({ name: ROUTE_NAMES.SIMULATION_DASHBOARD })
}
</script>

<template>
  <div class="simulation-detail-page">
    <SimulationFlowHeader title="시뮬레이션 결과" step="" @back="goBack" />

    <BaseLoading v-if="loading" class="simulation-detail-page__loading" />

    <div v-else-if="error" class="simulation-detail-page__error" role="alert">
      <strong>시뮬레이션 결과를 불러오지 못했어요.</strong>
      <button type="button" @click="goBack">마이페이지로 돌아가기</button>
    </div>

    <SimulationResultSummary
      v-else
      :latest-result="simulationResult"
      :report="simulationReport"
      :report-loading="reportLoading"
      :report-error="reportError"
      @restart="restartSimulation"
    />
  </div>
</template>

<style scoped>
.simulation-detail-page {
  min-height: 100%;
  background: #fff;
}

.simulation-detail-page__loading,
.simulation-detail-page__error {
  min-height: 360px;
}

.simulation-detail-page__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 32px 20px;
  color: #424242;
  text-align: center;
}

.simulation-detail-page__error button {
  border: 0;
  border-radius: 12px;
  padding: 12px 16px;
  background: #262626;
  color: #fff;
  font: inherit;
  cursor: pointer;
}
</style>
