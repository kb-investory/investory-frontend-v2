import { defineStore } from 'pinia'
import { ref } from 'vue'

import { queryClient } from '@/app/providers/queryClient'
import { getAccountsSummary, getHoldings, getHomeDashboard } from '@/features/home/api/homeApi'
import { queryKeys } from '@/shared/api/queryKeys'

const HOME_DASHBOARD_STALE_TIME = 30 * 1000
const HOME_ASSET_STALE_TIME = 60 * 1000

export const useHomeStore = defineStore('home', () => {
  const dashboard = ref(null)
  const summary = ref(null)
  const accounts = ref([])
  const holdings = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchDashboard({ force = false } = {}) {
    loading.value = true
    error.value = null

    try {
      if (force) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.home.dashboard(), exact: true })
      }

      dashboard.value = await queryClient.fetchQuery({
        queryKey: queryKeys.home.dashboard(),
        queryFn: () => getHomeDashboard(),
        staleTime: HOME_DASHBOARD_STALE_TIME,
      })
    } catch (requestError) {
      error.value = requestError
    } finally {
      loading.value = false
    }
  }

  async function fetchSummary({ force = false } = {}) {
    loading.value = true
    error.value = null

    try {
      if (force) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: queryKeys.home.accountSummary(),
            exact: true,
          }),
          queryClient.invalidateQueries({ queryKey: queryKeys.home.holdings(), exact: true }),
        ])
      }

      const [data, holdingsData] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: queryKeys.home.accountSummary(),
          queryFn: getAccountsSummary,
          staleTime: HOME_ASSET_STALE_TIME,
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.home.holdings(),
          queryFn: getHoldings,
          staleTime: HOME_ASSET_STALE_TIME,
        }),
      ])
      const accountSummary = data.summary
      const accountCount = accountSummary.accountCount ?? data.accounts?.length ?? 0

      summary.value = {
        title: accountSummary.title ?? '총 자산 요약',
        description:
          accountSummary.description ??
          `총 ${accountCount}개 계좌에서 ${accountSummary.totalMarketValue.toLocaleString()}원 운용 중입니다.`,
        totalMarketValue: accountSummary.totalMarketValue,
        totalUnrealizedPnl: accountSummary.totalUnrealizedPnl,
      }
      accounts.value = data.accounts ?? []
      holdings.value = holdingsData
    } catch (requestError) {
      error.value = requestError
    } finally {
      loading.value = false
    }
  }

  function reset() {
    dashboard.value = null
    summary.value = null
    accounts.value = []
    holdings.value = []
    loading.value = false
    error.value = null
    queryClient.removeQueries({ queryKey: queryKeys.home.all })
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
    reset,
  }
})
