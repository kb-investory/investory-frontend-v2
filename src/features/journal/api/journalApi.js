import journalData from '@/mocks/data/journal.json'

export async function getJournals() {
  return journalData.journals
}

export async function getJournalById(journalId) {
  return (
    journalData.journals.find((j) => j.journalId === Number(journalId)) || journalData.journals[0]
  )
}

export async function createJournal(payload) {
  const newJournal = {
    journalId: Date.now(),
    journalDate: payload.journalDate || new Date().toISOString().split('T')[0],
    marketThought: payload.marketThought || '',
    marketMood: payload.marketMood || 'CALM',
    tradeCount: 0,
    complianceRate: 100,
    createdAt: new Date().toISOString(),
    trades: [],
  }
  journalData.journals.unshift(newJournal)
  return newJournal
}

export async function updateJournal(journalId, payload) {
  const journal = await getJournalById(journalId)
  Object.assign(journal, payload)
  return journal
}

export async function deleteJournal(journalId) {
  const index = journalData.journals.findIndex((j) => j.journalId === Number(journalId))
  if (index !== -1) {
    journalData.journals.splice(index, 1)
  }
  return true
}

// Store compatibility aliases
export const getJournalEntries = getJournals
export const getJournalDetail = getJournalById
export const saveJournal = createJournal
