import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  getAccounts,
  getPortfolioAnalysis,
  getPortfolioHoldings,
  getPortfolioSummary,
  getStockAnalysis,
} from '@/modules/portfolio/services/portfolioService'

export const usePortfolioStore = defineStore('portfolio', () => {
  const portfolios = ref([])
  const totalAmounts = ref(0)
  const analysis = ref(null)
  const selectedStockAnalysis = ref(null)
  const accounts = ref([])
  const selectedAccountId = ref('ALL')
  const summary = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const selectedAccount = computed(() => {
    return (
      accounts.value.find((acc) => acc.id === selectedAccountId.value) ||
      accounts.value[0] || { id: 'ALL', name: '전체 계좌' }
    )
  })

  async function fetchAccounts() {
    try {
      accounts.value = await getAccounts()
    } catch (requestError) {
      error.value = requestError
    }
  }

  async function fetchSummary(accountId = selectedAccountId.value) {
    try {
      summary.value = await getPortfolioSummary(accountId)
    } catch (requestError) {
      error.value = requestError
    }
  }

  async function selectAccount(accountId) {
    selectedAccountId.value = accountId
    await Promise.all([fetchSummary(accountId), fetchPortfolios(accountId)])
  }

  async function fetchPortfolios() {
    loading.value = true
    error.value = null

    try {
      const response = await getPortfolioHoldings()
      portfolios.value = response.holdings
      totalAmounts.value = response.amounts
    } catch (requestError) {
      error.value = requestError
    } finally {
      loading.value = false
    }
  }

  async function fetchAnalysis() {
    analysis.value = await getPortfolioAnalysis()
  }

  async function fetchStockAnalysis(stockId) {
    selectedStockAnalysis.value = await getStockAnalysis(stockId)
  }

  return {
    portfolios,
    totalAmounts,
    analysis,
    selectedStockAnalysis,
    accounts,
    selectedAccountId,
    selectedAccount,
    summary,
    loading,
    error,
    fetchAccounts,
    fetchSummary,
    selectAccount,
    fetchPortfolios,
    fetchAnalysis,
    fetchStockAnalysis,
  }
})
