import { defineStore } from 'pinia'
import { ref } from 'vue'

import { queryClient } from '@/app/providers/queryClient'
import {
  deleteJournal as deleteJournalApi,
  getCalendarActivity,
  getJournalEntryOnDate,
  getJournalDetail,
  getJournalEntries,
  saveJournal as saveJournalApi,
  updateJournal as updateJournalApi,
} from '@/features/journal/api/journalApi'
import { queryKeys } from '@/shared/api/queryKeys'

const JOURNAL_STALE_TIME = 30 * 1000

async function invalidateJournalWriteQueries() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.journal.all }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.home.dashboard(),
      exact: true,
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.mypage.overview(),
      exact: true,
    }),
  ])
}

export const useJournalStore = defineStore('journal', () => {
  const entries = ref([])
  const calendarActivities = ref([])
  const selectedDetail = ref(null)
  const dailyEntry = ref(null)
  const loading = ref(false)
  const error = ref('')
  let latestCalendarRequestId = 0
  let latestDailyEntryRequestId = 0

  async function fetchJournals(params) {
    loading.value = true
    error.value = ''
    try {
      const response = await queryClient.fetchQuery({
        queryKey: queryKeys.journal.entries(params),
        queryFn: () => getJournalEntries(params),
        staleTime: JOURNAL_STALE_TIME,
      })
      entries.value = response.entries
    } catch (requestError) {
      error.value = requestError.message
      throw requestError
    } finally {
      loading.value = false
    }
  }

  async function fetchCalendarRange(startDate, endDate) {
    const requestId = ++latestCalendarRequestId

    loading.value = true
    error.value = ''

    try {
      const { journalResponse, activityResponse } = await queryClient.fetchQuery({
        queryKey: queryKeys.journal.calendar(startDate, endDate),
        queryFn: async () => {
          const [journals, activities] = await Promise.all([
            getJournalEntries({ startDate, endDate }),
            getCalendarActivity({ startDate, endDate }),
          ])

          return { journalResponse: journals, activityResponse: activities }
        },
        staleTime: JOURNAL_STALE_TIME,
      })

      if (requestId === latestCalendarRequestId) {
        entries.value = journalResponse.entries
        calendarActivities.value = activityResponse
      }
    } catch (requestError) {
      if (requestId === latestCalendarRequestId) {
        error.value = requestError.message
      }
    } finally {
      if (requestId === latestCalendarRequestId) {
        loading.value = false
      }
    }
  }

  async function fetchMonthlyCalendar(year, month) {
    const lastDay = new Date(year, month, 0).getDate()
    const monthKey = `${year}-${String(month).padStart(2, '0')}`

    await fetchCalendarRange(`${monthKey}-01`, `${monthKey}-${String(lastDay).padStart(2, '0')}`)
  }

  async function fetchJournalDetail(journalId) {
    loading.value = true
    error.value = ''
    try {
      selectedDetail.value = await queryClient.fetchQuery({
        queryKey: queryKeys.journal.detail(journalId),
        queryFn: () => getJournalDetail(journalId),
        staleTime: JOURNAL_STALE_TIME,
      })
    } catch (requestError) {
      error.value = requestError.message
      throw requestError
    } finally {
      loading.value = false
    }
  }

  async function fetchDailyEntry(journalDate) {
    const requestId = ++latestDailyEntryRequestId

    loading.value = true
    error.value = ''
    try {
      const response = await queryClient.fetchQuery({
        queryKey: queryKeys.journal.daily(journalDate),
        queryFn: () => getJournalEntryOnDate(journalDate),
        staleTime: JOURNAL_STALE_TIME,
      })

      if (requestId === latestDailyEntryRequestId) {
        dailyEntry.value = response
      }

      return response
    } catch (requestError) {
      if (requestId === latestDailyEntryRequestId) {
        error.value = requestError.message
      }
      throw requestError
    } finally {
      if (requestId === latestDailyEntryRequestId) {
        loading.value = false
      }
    }
  }

  async function addJournal(payload) {
    loading.value = true
    error.value = ''
    try {
      const newJournal = await saveJournalApi(payload)
      await invalidateJournalWriteQueries()
      await fetchJournals()
      return newJournal
    } catch (requestError) {
      error.value = requestError.message
      throw requestError
    } finally {
      loading.value = false
    }
  }

  async function editJournal(journalId, payload) {
    loading.value = true
    error.value = ''
    try {
      const result = await updateJournalApi(journalId, payload)
      await invalidateJournalWriteQueries()
      await fetchJournals()
      return result
    } catch (requestError) {
      error.value = requestError.message
      throw requestError
    } finally {
      loading.value = false
    }
  }

  async function saveDailyJournal(payload) {
    loading.value = true
    error.value = ''
    try {
      const currentJournal = dailyEntry.value?.journal
      if (currentJournal) {
        await updateJournalApi(currentJournal.journalId, {
          marketThought: payload.marketThought,
          marketMood: payload.marketMood,
          tradeNotes: payload.tradeNotes,
        })
      } else {
        await saveJournalApi(payload)
      }

      await invalidateJournalWriteQueries()
      dailyEntry.value = await queryClient.fetchQuery({
        queryKey: queryKeys.journal.daily(payload.journalDate),
        queryFn: () => getJournalEntryOnDate(payload.journalDate),
      })
      return dailyEntry.value
    } catch (requestError) {
      error.value = requestError.message
      throw requestError
    } finally {
      loading.value = false
    }
  }

  async function removeJournal(journalId) {
    loading.value = true
    error.value = ''
    try {
      await deleteJournalApi(journalId)
      entries.value = entries.value.filter((e) => e.journalId !== journalId)
      await invalidateJournalWriteQueries()
    } catch (requestError) {
      error.value = requestError.message
      throw requestError
    } finally {
      loading.value = false
    }
  }

  function reset() {
    latestCalendarRequestId += 1
    latestDailyEntryRequestId += 1
    entries.value = []
    calendarActivities.value = []
    selectedDetail.value = null
    dailyEntry.value = null
    loading.value = false
    error.value = ''
    queryClient.removeQueries({ queryKey: queryKeys.journal.all })
  }

  return {
    entries,
    journals: entries, // Alias for backward compatibility
    calendarActivities,
    selectedDetail,
    dailyEntry,
    loading,
    error,
    fetchJournals,
    fetchCalendarRange,
    fetchMonthlyCalendar,
    fetchJournalDetail,
    fetchDailyEntry,
    addJournal,
    editJournal,
    saveDailyJournal,
    removeJournal,
    reset,
  }
})
