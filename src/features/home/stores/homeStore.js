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
        title: data.title,
        description: data.description,
        totalMarketValue: data.totalMarketValue,
        totalUnrealizedPnl: data.totalUnrealizedPnl,
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
