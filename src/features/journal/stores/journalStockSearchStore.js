import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  getJournalStockSearchData,
  saveRecentJournalStock,
  searchJournalStocks,
} from '@/features/journal/api/journalStockApi'

export const useJournalStockSearchStore = defineStore('journal-stock-search', () => {
  const stocks = ref([])
  const recentSecurityCodes = ref([])
  const searchResults = ref([])
  const isLoading = ref(false)
  const error = ref('')
  let latestSearchRequestId = 0

  const recentStocks = computed(() =>
    recentSecurityCodes.value
      .map((securityCode) => stocks.value.find((stock) => stock.securityCode === securityCode))
      .filter(Boolean),
  )

  const heldStocks = computed(() =>
    stocks.value.filter((stock) => Number.isFinite(stock.holdingQuantity)),
  )

  async function initialize() {
    const response = await getJournalStockSearchData()
    stocks.value = response.stocks
    recentSecurityCodes.value = response.recentSecurityCodes
  }

  async function search(keyword) {
    const requestId = ++latestSearchRequestId

    if (!keyword.trim()) {
      searchResults.value = []
      isLoading.value = false
      error.value = ''
      return
    }

    isLoading.value = true
    error.value = ''

    try {
      const response = await searchJournalStocks(keyword)
      if (requestId === latestSearchRequestId) {
        searchResults.value = response
      }
    } catch (requestError) {
      if (requestId === latestSearchRequestId) {
        error.value = requestError.message
        searchResults.value = []
      }
    } finally {
      if (requestId === latestSearchRequestId) {
        isLoading.value = false
      }
    }
  }

  async function rememberStock(securityCode) {
    recentSecurityCodes.value = await saveRecentJournalStock(securityCode)
  }

  function findStock(securityCode) {
    return stocks.value.find((stock) => stock.securityCode === securityCode) ?? null
  }

  return {
    stocks,
    recentStocks,
    heldStocks,
    searchResults,
    isLoading,
    error,
    initialize,
    search,
    rememberStock,
    findStock,
  }
})
