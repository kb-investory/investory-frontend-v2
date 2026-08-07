import journalData from '@/mocks/data/journal.json'
import { request } from '@/shared/api/client'

const USE_MOCK_FALLBACK = import.meta.env.VITE_USE_MOCK_FALLBACK !== 'false'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function formatLocalDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatUtcDate(date = new Date()) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function findJournalByDate(journalDate) {
  return journalData.journals.find((journal) => journal.journalDate === journalDate)
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
  return formatLocalDate(new Date())
}

export async function getJournals() {
  return getJournalEntries()
}

export async function getJournalEntries({ startDate, endDate } = {}) {
  try {
    const searchParams = new URLSearchParams()
    if (startDate) searchParams.set('startDate', startDate)
    if (endDate) searchParams.set('endDate', endDate)

    const query = searchParams.toString()
    return await request(`/journal/entries${query ? `?${query}` : ''}`)
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API /journal/entries 요청 실패, 목데이터를 사용합니다:', error)
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
}

export async function getCalendarActivity({ year, month, startDate, endDate } = {}) {
  try {
    const entriesData = await getJournalEntries({ startDate, endDate })
    const monthKey = year && month ? `${year}-${String(month).padStart(2, '0')}` : null
    return (entriesData.entries || [])
      .map((entry) => ({
        activityDate: entry.journalDate,
        hasJournal: true,
        tradeCount: entry.tradeCount ?? 0,
      }))
      .filter((act) => !monthKey || act.activityDate.startsWith(monthKey))
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    const monthKey = year && month ? `${year}-${String(month).padStart(2, '0')}` : null
    return clone(
      (journalData.calendarActivity ?? []).filter((activity) => {
        if (startDate && activity.activityDate < startDate) return false
        if (endDate && activity.activityDate > endDate) return false
        return !monthKey || activity.activityDate.startsWith(monthKey)
      }),
    )
  }
}

export async function getJournalById(journalId) {
  try {
    return await request(`/journal/entries/${journalId}`)
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn(`API /journal/entries/${journalId} 요청 실패, 목데이터를 사용합니다:`, error)
    const dailyEntry = findDailyEntryByJournalId(journalId)
    if (dailyEntry?.journal) {
      return clone({ ...dailyEntry.journal, trades: dailyEntry.trades })
    }

    const journal = journalData.journals.find((item) => item.journalDate === Number(journalId))
    if (!journal) {
      throw new Error('투자일지를 찾을 수 없습니다.', { cause: error })
    }

    return clone(journal)
  }
}

export async function getJournalEntryOnDate(journalDate = getDefaultJournalDate()) {
  try {
    return await request(`/journal/entries/on/${journalDate}`)
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn(`API /journal/entries/on/${journalDate} 요청 실패, 목데이터를 사용합니다:`, error)
    const entry = journalData.dailyEntries?.find((item) => item.journalDate === journalDate)
    const journal = entry?.journal ?? findJournalByDate(journalDate) ?? null
    const isFutureDate = journalDate > getDefaultJournalDate()

    return clone({
      journalDate,
      canCreate: !journal && !isFutureDate && entry?.canCreate !== false,
      journal,
      trades: entry?.trades ?? journal?.trades ?? [],
    })
  }
}

export async function createJournal(payload) {
  const journalDate = payload.journalDate || getDefaultJournalDate()

  try {
    return await request('/journal/entries', {
      method: 'POST',
      body: JSON.stringify({
        journalDate,
        marketThought: payload.marketThought || '',
        marketMood: payload.marketMood || null,
        tradeNotes: (payload.tradeNotes || []).map((note) => ({
          tradeId: Number(note.tradeId),
          rationaleText: note.rationaleText || '',
        })),
      }),
    })
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API POST /journal/entries 요청 실패, 목데이터 생성을 흉내냅니다:', error)
    let dailyEntry = journalData.dailyEntries?.find((entry) => entry.journalDate === journalDate)

    if (dailyEntry?.journal) {
      throw new Error('해당 날짜의 투자일지가 이미 존재합니다.', { cause: error })
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
}

export async function updateJournal(journalId, payload) {
  try {
    return await request(`/journal/entries/${journalId}`, {
      method: 'PUT',
      body: JSON.stringify({
        marketThought: payload.marketThought || '',
        marketMood: payload.marketMood || null,
        tradeNotes: (payload.tradeNotes || []).map((note) => ({
          tradeId: Number(note.tradeId),
          rationaleText: note.rationaleText || '',
        })),
      }),
    })
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn(`API PUT /journal/entries/${journalId} 요청 실패:`, error)
    const dailyEntry = findDailyEntryByJournalId(journalId)

    if (dailyEntry?.journal) {
      Object.assign(dailyEntry.journal, {
        marketThought: payload.marketThought,
        marketMood: payload.marketMood,
        updatedAt: new Date().toISOString(),
      })
      applyTradeNotes(dailyEntry, payload.tradeNotes)
      return clone(dailyEntry.journal)
    }

    const journal = journalData.journals.find((item) => item.journalId === Number(journalId))
    if (!journal) {
      throw new Error('투자일지를 찾을 수 없습니다.', { cause: error })
    }

    Object.assign(journal, payload, { updatedAt: new Date().toISOString() })
    return clone(journal)
  }
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

export const getJournalDetail = getJournalById
export const saveJournal = createJournal
