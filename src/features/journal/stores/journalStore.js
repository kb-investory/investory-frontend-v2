import { defineStore } from 'pinia'
import { ref } from 'vue'

import { queryClient } from '@/app/providers/queryClient'
import {
  deleteJournal as deleteJournalApi,
  getCalendarActivity,
  getJournalEntryOnDate,
  getJournalDetail,
  getJournalEntries,
  getJournalMonthRange,
  saveJournal as saveJournalApi,
  updateJournal as updateJournalApi,
} from '@/features/journal/api/journalApi'
import { queryKeys } from '@/shared/api/queryKeys'

const JOURNAL_STALE_TIME = 30 * 1000

function getEntryJournal(entry) {
  if (!entry || typeof entry !== 'object') return null
  return entry.journal ?? (entry.journalId != null ? entry : null)
}

function getEntryDate(entry) {
  const journal = getEntryJournal(entry)
  return entry?.journalDate ?? journal?.journalDate ?? null
}

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
  let lastJournalRange = null

  async function fetchJournals(params = lastJournalRange ?? getJournalMonthRange()) {
    const fallbackRange = getJournalMonthRange(params?.startDate || params?.endDate)
    const range = {
      startDate: params?.startDate || fallbackRange.startDate,
      endDate: params?.endDate || fallbackRange.endDate,
    }
    lastJournalRange = range
    loading.value = true
    error.value = ''
    try {
      const response = await queryClient.fetchQuery({
        queryKey: queryKeys.journal.entries(range),
        queryFn: () => getJournalEntries(range),
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
    lastJournalRange = { startDate, endDate }

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

  async function fetchDailyEntry(journalDate, { preferCalendarTrades = false } = {}) {
    const requestId = ++latestDailyEntryRequestId

    loading.value = true
    error.value = ''
    try {
      let response = null
      let dailyRequestError = null

      try {
        response = await queryClient.fetchQuery({
          queryKey: queryKeys.journal.daily(journalDate),
          queryFn: () => getJournalEntryOnDate(journalDate),
          // 사용자가 달력에서 날짜를 직접 선택한 경우에는 이전의 "일지 없음"
          // 캐시보다 방금 저장된 서버 데이터를 우선해 상세 화면을 갱신한다.
          staleTime: 0,
        })
      } catch (requestError) {
        // 일자별 API가 일시적으로 실패하더라도 월 목록에 이미 존재하는 일지는
        // journalId로 상세 재조회해 사용자가 작성한 내용을 계속 볼 수 있게 한다.
        dailyRequestError = requestError
      }

      const calendarTrades = calendarActivities.value.find(
        (activity) => activity.activityDate === journalDate,
      )?.trades

      if (preferCalendarTrades && calendarTrades?.length && !response?.trades?.length) {
        response = {
          ...response,
          journalDate: response?.journalDate ?? journalDate,
          trades: calendarTrades,
        }
      }

      if (!response?.journal) {
        const summaryEntry = entries.value.find((entry) => getEntryDate(entry) === journalDate)
        const summaryJournal = getEntryJournal(summaryEntry)
        const preservedTrades = response?.trades?.length ? response.trades : (calendarTrades ?? [])

        if (summaryJournal?.journalId != null) {
          try {
            const detail = await queryClient.fetchQuery({
              queryKey: queryKeys.journal.detail(summaryJournal.journalId),
              queryFn: () => getJournalDetail(summaryJournal.journalId),
              staleTime: 0,
            })
            response = detail?.journal
              ? {
                  ...detail,
                  journalDate: detail.journalDate ?? journalDate,
                  trades: detail.trades?.length ? detail.trades : preservedTrades,
                }
              : {
                  ...response,
                  journalDate,
                  canCreate: false,
                  journal: summaryJournal,
                  trades: preservedTrades,
                }
          } catch {
            response = {
              ...response,
              journalDate,
              canCreate: false,
              journal: summaryJournal,
              trades: preservedTrades,
            }
          }
        }
      }

      if (!response?.journal && dailyRequestError) {
        throw dailyRequestError
      }

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
      await fetchJournals(lastJournalRange ?? getJournalMonthRange(payload.journalDate))
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
      await fetchJournals(lastJournalRange ?? getJournalMonthRange(dailyEntry.value?.journalDate))
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
    lastJournalRange = null
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
