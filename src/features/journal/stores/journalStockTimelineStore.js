import { ref } from 'vue'
import { defineStore } from 'pinia'

import { queryClient } from '@/app/providers/queryClient'
import { getJournalStockTimeline } from '@/features/journal/api/journalStockApi'
import { queryKeys } from '@/shared/api/queryKeys'

const STOCK_TIMELINE_STALE_TIME = 60 * 1000

export const useJournalStockTimelineStore = defineStore('journal-stock-timeline', () => {
  const timeline = ref(null)
  const isLoading = ref(false)
  const error = ref('')
  let latestRequestId = 0

  async function fetchTimeline(securityCode) {
    const requestId = ++latestRequestId

    isLoading.value = true
    error.value = ''
    timeline.value = null

    try {
      const response = await queryClient.fetchQuery({
        queryKey: queryKeys.journal.stockTimeline(securityCode),
        queryFn: () => getJournalStockTimeline({ securityCode }),
        staleTime: STOCK_TIMELINE_STALE_TIME,
      })

      if (requestId === latestRequestId) {
        timeline.value = response
      }

      return response
    } catch (requestError) {
      if (requestId === latestRequestId) {
        error.value = requestError.message
      }

      throw requestError
    } finally {
      if (requestId === latestRequestId) {
        isLoading.value = false
      }
    }
  }

  function reset() {
    latestRequestId += 1
    timeline.value = null
    isLoading.value = false
    error.value = ''
    queryClient.removeQueries({ queryKey: ['journal', 'stock-timeline'] })
  }

  return {
    timeline,
    isLoading,
    error,
    fetchTimeline,
    reset,
  }
})
