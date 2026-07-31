import { defineStore } from 'pinia'
import { ref } from 'vue'

import { getAccountsSummary, getHoldings } from '@/features/home/api/homeApi'

export const useHomeStore = defineStore('home', () => {
  const summary = ref(null)
  const accounts = ref([])
  const holdings = ref([])
  const loading = ref(false)

  async function fetchSummary() {
    loading.value = true
    try {
      const data = await getAccountsSummary()
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
      holdings.value = await getHoldings()
    } finally {
      loading.value = false
    }
  }

  return {
    summary,
    accounts,
    holdings,
    loading,
    fetchSummary,
  }
})
