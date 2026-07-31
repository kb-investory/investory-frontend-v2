import { defineStore } from 'pinia'
import { ref } from 'vue'

import { getAccountsSummary, getHoldings, getHomeDashboard } from '@/features/home/api/homeApi'

export const useHomeStore = defineStore('home', () => {
  const dashboard = ref(null)
  const summary = ref(null)
  const accounts = ref([])
  const holdings = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchDashboard() {
    loading.value = true
    error.value = null

    try {
      dashboard.value = await getHomeDashboard()
    } catch (requestError) {
      error.value = requestError
    } finally {
      loading.value = false
    }
  }

  async function fetchSummary() {
    loading.value = true
    try {
      const data = await getAccountsSummary()
      summary.value = {
        title: '총 자산 요약',
        description: `총 ${data.summary.accountCount}개 계좌에서 ${data.summary.totalMarketValue.toLocaleString()}원 운용 중입니다.`,
        totalMarketValue: data.summary.totalMarketValue,
        totalUnrealizedPnl: data.summary.totalUnrealizedPnl,
      }
      accounts.value = data.accounts
      holdings.value = await getHoldings()
    } finally {
      loading.value = false
    }
  }

  return {
    dashboard,
    summary,
    accounts,
    holdings,
    loading,
    error,
    fetchDashboard,
    fetchSummary,
  }
})
