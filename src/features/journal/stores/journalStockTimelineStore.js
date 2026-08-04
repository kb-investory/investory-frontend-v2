import { ref } from 'vue'
import { defineStore } from 'pinia'

import { getJournalStockTimeline } from '@/features/journal/api/journalStockApi'

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
      const response = await getJournalStockTimeline({ securityCode })

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

  return {
    timeline,
    isLoading,
    error,
    fetchTimeline,
  }
})
