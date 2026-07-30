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
    summary,
    accounts,
    holdings,
    loading,
    fetchSummary,
  }
})
