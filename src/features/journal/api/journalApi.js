import journalData from '@/mocks/data/journal.json'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function findDailyEntryByJournalId(journalId) {
  return journalData.dailyEntries?.find((entry) => entry.journal?.journalId === Number(journalId))
}

function applyTradeNotes(entry, tradeNotes = []) {
  const noteMap = new Map(tradeNotes.map((note) => [Number(note.tradeId), note.rationaleText]))

  entry.trades.forEach((trade) => {
    const rationaleText = noteMap.get(trade.tradeId)
    trade.note = rationaleText
      ? {
          journalTradeNoteId: trade.note?.journalTradeNoteId ?? Date.now() + trade.tradeId,
          rationaleText,
          createdAt: trade.note?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : null
  })
}

export function getDefaultJournalDate() {
  return journalData.dailyEntries?.[0]?.journalDate ?? new Date().toISOString().split('T')[0]
}

export async function getJournals() {
  return { entries: clone(journalData.journals) }
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

  return { entries: clone(entries) }
}

export async function getCalendarActivity({ year, month }) {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  return clone(
    (journalData.calendarActivity ?? []).filter((activity) =>
      activity.activityDate.startsWith(monthKey),
    ),
  )
}

export async function getJournalById(journalId) {
  const dailyEntry = findDailyEntryByJournalId(journalId)
  if (dailyEntry?.journal) {
    return clone({ ...dailyEntry.journal, trades: dailyEntry.trades })
  }

  const journal = journalData.journals.find((item) => item.journalId === Number(journalId))
  if (!journal) {
    throw new Error('투자일지를 찾을 수 없습니다.')
  }

  return clone(journal)
}

export async function getJournalEntryOnDate(journalDate = getDefaultJournalDate()) {
  const entry = journalData.dailyEntries?.find((item) => item.journalDate === journalDate)

  if (entry) {
    return clone(entry)
  }

  return {
    journalDate,
    canCreate: true,
    journal: null,
    trades: [],
  }
}

export async function createJournal(payload) {
  const journalDate = payload.journalDate || new Date().toISOString().split('T')[0]
  let dailyEntry = journalData.dailyEntries?.find((entry) => entry.journalDate === journalDate)

  if (dailyEntry?.journal) {
    throw new Error('해당 날짜의 투자일지가 이미 존재합니다.')
  }

  if (!dailyEntry) {
    dailyEntry = {
      journalDate,
      canCreate: true,
      journal: null,
      trades: [],
    }
    journalData.dailyEntries ??= []
    journalData.dailyEntries.push(dailyEntry)
  }

  const now = new Date().toISOString()
  const newJournal = {
    journalId: Date.now(),
    journalDate,
    marketThought: payload.marketThought || '',
    marketMood: payload.marketMood || 'CALM',
    tradeCount: dailyEntry.trades.length,
    complianceRate: 100,
    createdAt: now,
    updatedAt: now,
    editableUntilAt: null,
    isBackfilled: false,
    isEditable: true,
  }

  dailyEntry.journal = { ...newJournal }
  dailyEntry.canCreate = false
  applyTradeNotes(dailyEntry, payload.tradeNotes)

  journalData.journals.unshift(newJournal)
  return clone(newJournal)
}

export async function updateJournal(journalId, payload) {
  const dailyEntry = findDailyEntryByJournalId(journalId)

  if (dailyEntry?.journal) {
    Object.assign(dailyEntry.journal, {
      marketThought: payload.marketThought,
      marketMood: payload.marketMood,
      updatedAt: new Date().toISOString(),
    })
    applyTradeNotes(dailyEntry, payload.tradeNotes)

    const listJournal = journalData.journals.find(
      (journal) => journal.journalId === Number(journalId),
    )
    if (listJournal) {
      Object.assign(listJournal, dailyEntry.journal)
    }

    return clone(dailyEntry.journal)
  }

  const journal = journalData.journals.find((item) => item.journalId === Number(journalId))
  if (!journal) {
    throw new Error('투자일지를 찾을 수 없습니다.')
  }

  Object.assign(journal, payload, { updatedAt: new Date().toISOString() })
  return clone(journal)
}

export async function deleteJournal(journalId) {
  const index = journalData.journals.findIndex((j) => j.journalId === Number(journalId))
  if (index !== -1) {
    journalData.journals.splice(index, 1)
  }

  const dailyEntry = findDailyEntryByJournalId(journalId)
  if (dailyEntry) {
    dailyEntry.journal = null
    dailyEntry.canCreate = true
    dailyEntry.trades.forEach((trade) => {
      trade.note = null
    })
  }

  return true
}

// Store compatibility aliases
export const getJournalDetail = getJournalById
export const saveJournal = createJournal
