import journalData from '@/mocks/data/journal.json'

export async function getJournals() {
  return journalData.journals
}

export async function getJournalEntries({ startDate, endDate } = {}) {
  const entries = journalData.journals.filter((journal) => {
    if (startDate && journal.journalDate < startDate) {
      return false
    }

    if (endDate && journal.journalDate > endDate) {
      return false
    }

    return true
  })

  return { entries }
}

export async function getCalendarActivity({ year, month }) {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  return journalData.calendarActivity.filter((activity) =>
    activity.activityDate.startsWith(monthKey),
  )
}

export async function getJournalById(journalId) {
  return journalData.journals.find((journal) => journal.journalId === Number(journalId)) || null
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

  if (!journal) {
    throw new Error('수정할 투자 일지를 찾을 수 없습니다.')
  }

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
export const getJournalDetail = getJournalById
export const saveJournal = createJournal
