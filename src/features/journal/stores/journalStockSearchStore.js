import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { queryClient } from '@/app/providers/queryClient'
import {
  getJournalStockSearchData,
  saveRecentJournalStock,
  searchJournalStocks,
} from '@/features/journal/api/journalStockApi'
import { queryKeys } from '@/shared/api/queryKeys'

const STOCK_SEARCH_STALE_TIME = 5 * 60 * 1000

export const useJournalStockSearchStore = defineStore('journal-stock-search', () => {
  const stocks = ref([])
  const heldStocks = ref([])
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

  async function initialize() {
    const response = await queryClient.fetchQuery({
      queryKey: queryKeys.journal.stockSearchData(),
      queryFn: getJournalStockSearchData,
      staleTime: STOCK_SEARCH_STALE_TIME,
    })
    stocks.value = response.stocks
    heldStocks.value = response.heldStocks ?? []
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
      const normalizedKeyword = keyword.trim().toLocaleLowerCase('ko-KR').replaceAll(' ', '')
      const response = await queryClient.fetchQuery({
        queryKey: queryKeys.journal.stockSearch(normalizedKeyword),
        queryFn: () => searchJournalStocks(keyword),
        staleTime: STOCK_SEARCH_STALE_TIME,
      })
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
    queryClient.setQueryData(queryKeys.journal.stockSearchData(), {
      stocks: stocks.value,
      heldStocks: heldStocks.value,
      recentSecurityCodes: recentSecurityCodes.value,
    })
  }

  function findStock(securityCode) {
    return stocks.value.find((stock) => stock.securityCode === securityCode) ?? null
  }

  function reset() {
    latestSearchRequestId += 1
    stocks.value = []
    heldStocks.value = []
    recentSecurityCodes.value = []
    searchResults.value = []
    isLoading.value = false
    error.value = ''
    queryClient.removeQueries({ queryKey: queryKeys.journal.stockSearchData() })
    queryClient.removeQueries({ queryKey: ['journal', 'stock-search'] })
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
    reset,
  }
})
