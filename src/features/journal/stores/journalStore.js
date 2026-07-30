import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  deleteJournal as deleteJournalApi,
  getJournalDetail,
  getJournalEntries,
  saveJournal as saveJournalApi,
  updateJournal as updateJournalApi,
} from '@/features/journal/api/journalApi'

export const useJournalStore = defineStore('journal', () => {
  const entries = ref([])
  const selectedDetail = ref(null)
  const loading = ref(false)

  async function fetchJournals() {
    loading.value = true
    try {
      const response = await getJournalEntries()
      entries.value = response.entries
    } finally {
      loading.value = false
    }
  }

  async function fetchJournalDetail(journalId) {
    loading.value = true
    try {
      selectedDetail.value = await getJournalDetail(journalId)
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
    selectedDetail,
    loading,
    fetchJournals,
    fetchJournalDetail,
    addJournal,
    editJournal,
    removeJournal,
  }
})
