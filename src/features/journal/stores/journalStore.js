import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  deleteJournal as deleteJournalApi,
  getCalendarActivity,
  getJournalDetail,
  getJournalEntries,
  saveJournal as saveJournalApi,
  updateJournal as updateJournalApi,
} from '@/features/journal/api/journalApi'

export const useJournalStore = defineStore('journal', () => {
  const entries = ref([])
  const calendarActivities = ref([])
  const selectedDetail = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function fetchJournals(params) {
    loading.value = true
    error.value = null
    try {
      const response = await getJournalEntries(params)
      entries.value = response.entries
    } catch (requestError) {
      error.value = requestError
    } finally {
      loading.value = false
    }
  }

  async function fetchMonthlyCalendar(year, month) {
    loading.value = true
    error.value = null

    const lastDay = new Date(year, month, 0).getDate()
    const monthKey = `${year}-${String(month).padStart(2, '0')}`

    try {
      const [journalResponse, activityResponse] = await Promise.all([
        getJournalEntries({
          startDate: `${monthKey}-01`,
          endDate: `${monthKey}-${String(lastDay).padStart(2, '0')}`,
        }),
        getCalendarActivity({ year, month }),
      ])

      entries.value = journalResponse.entries
      calendarActivities.value = activityResponse
    } catch (requestError) {
      error.value = requestError
    } finally {
      loading.value = false
    }
  }

  async function fetchJournalDetail(journalId) {
    loading.value = true
    error.value = null
    try {
      selectedDetail.value = await getJournalDetail(journalId)
    } catch (requestError) {
      error.value = requestError
    } finally {
      loading.value = false
    }
  }

  async function addJournal(payload) {
    loading.value = true
    try {
      const newJournal = await saveJournalApi(payload)
      await fetchJournals()
      return newJournal
    } finally {
      loading.value = false
    }
  }

  async function editJournal(journalId, payload) {
    loading.value = true
    try {
      const result = await updateJournalApi(journalId, payload)
      await fetchJournals()
      return result
    } finally {
      loading.value = false
    }
  }

  async function removeJournal(journalId) {
    loading.value = true
    try {
      await deleteJournalApi(journalId)
      entries.value = entries.value.filter((e) => e.journalId !== journalId)
    } finally {
      loading.value = false
    }
  }

  return {
    entries,
    journals: entries, // Alias for backward compatibility
    calendarActivities,
    selectedDetail,
    loading,
    error,
    fetchJournals,
    fetchMonthlyCalendar,
    fetchJournalDetail,
    addJournal,
    editJournal,
    removeJournal,
  }
})
