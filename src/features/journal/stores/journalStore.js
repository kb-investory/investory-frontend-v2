import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  deleteJournal as deleteJournalApi,
  getJournalEntryOnDate,
  getJournalDetail,
  getJournalEntries,
  saveJournal as saveJournalApi,
  updateJournal as updateJournalApi,
} from '@/features/journal/api/journalApi'

export const useJournalStore = defineStore('journal', () => {
  const entries = ref([])
  const selectedDetail = ref(null)
  const dailyEntry = ref(null)
  const loading = ref(false)
  const error = ref('')

  async function fetchJournals() {
    loading.value = true
    error.value = ''
    try {
      const response = await getJournalEntries()
      entries.value = response.entries
    } catch (requestError) {
      error.value = requestError.message
      throw requestError
    } finally {
      loading.value = false
    }
  }

  async function fetchJournalDetail(journalId) {
    loading.value = true
    error.value = ''
    try {
      selectedDetail.value = await getJournalDetail(journalId)
    } catch (requestError) {
      error.value = requestError.message
      throw requestError
    } finally {
      loading.value = false
    }
  }

  async function fetchDailyEntry(journalDate) {
    loading.value = true
    error.value = ''
    try {
      dailyEntry.value = await getJournalEntryOnDate(journalDate)
      return dailyEntry.value
    } catch (requestError) {
      error.value = requestError.message
      throw requestError
    } finally {
      loading.value = false
    }
  }

  async function addJournal(payload) {
    loading.value = true
    error.value = ''
    try {
      const newJournal = await saveJournalApi(payload)
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

      dailyEntry.value = await getJournalEntryOnDate(payload.journalDate)
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
    } catch (requestError) {
      error.value = requestError.message
      throw requestError
    } finally {
      loading.value = false
    }
  }

  return {
    entries,
    journals: entries, // Alias for backward compatibility
    selectedDetail,
    dailyEntry,
    loading,
    error,
    fetchJournals,
    fetchJournalDetail,
    fetchDailyEntry,
    addJournal,
    editJournal,
    saveDailyJournal,
    removeJournal,
  }
})
