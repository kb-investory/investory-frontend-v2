import journalData from '@/mocks/data/journal.json'
import { getLedgerTrades } from '@/features/ledger/api/ledgerApi'
import { request } from '@/shared/api/client'

const JOURNAL_TIME_ZONE = 'Asia/Seoul'
const USE_MOCK_JOURNAL = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_JOURNAL === 'true'
const JOURNAL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: JOURNAL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function cloneMockData(value) {
  return JSON.parse(JSON.stringify(value))
}

function formatLocalDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatJournalDate(instant) {
  if (!instant) return null

  const parts = JOURNAL_DATE_FORMATTER.formatToParts(new Date(instant))
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function addDaysToDateKey(dateKey, amount) {
  if (!dateKey) return dateKey

  const date = new Date(`${dateKey}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

async function getLedgerTradesForJournalRange(startDate, endDate) {
  const ledgerFrom = startDate ? addDaysToDateKey(startDate, -1) : undefined
  const firstPage = await getLedgerTrades({ from: ledgerFrom, to: endDate, page: 0, size: 100 })
  const remainingPages = Array.from(
    { length: Math.max(0, (firstPage?.totalPages ?? 1) - 1) },
    (_, index) => index + 1,
  )
  const remainingResults = await Promise.all(
    remainingPages.map((page) =>
      getLedgerTrades({ from: ledgerFrom, to: endDate, page, size: 100 }),
    ),
  )

  return [
    ...(firstPage?.content || []),
    ...remainingResults.flatMap((result) => result?.content || []),
  ]
    .map((trade) => ({ ...trade, journalDate: formatJournalDate(trade.tradedAt) }))
    .filter(
      (trade) =>
        trade.journalDate &&
        (!startDate || trade.journalDate >= startDate) &&
        (!endDate || trade.journalDate <= endDate),
    )
}

function findDailyEntryByJournalId(journalId) {
  return journalData.dailyEntries?.find((entry) => entry.journal?.journalId === Number(journalId))
}

function findMockDailyEntry(journalDate) {
  return journalData.dailyEntries?.find((entry) => entry.journalDate === journalDate)
}

function applyMockTradeNotes(entry, tradeNotes = []) {
  const notesByTradeId = new Map(
    tradeNotes.map((note) => [Number(note.tradeId), note.rationaleText]),
  )

  entry.trades.forEach((trade) => {
    const rationaleText = notesByTradeId.get(Number(trade.tradeId))
    if (rationaleText === undefined) return

    trade.note = rationaleText
      ? {
          journalTradeNoteId: trade.note?.journalTradeNoteId ?? Date.now() + Number(trade.tradeId),
          journalId: entry.journal?.journalId ?? null,
          journalDate: entry.journalDate,
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

export function getJournalMonthRange(dateKey = getDefaultJournalDate()) {
  const [year, month] = String(dateKey).split('-').map(Number)
  const safeYear = Number.isInteger(year) ? year : new Date().getFullYear()
  const safeMonth = Number.isInteger(month) && month >= 1 && month <= 12 ? month : 1
  const lastDay = new Date(Date.UTC(safeYear, safeMonth, 0)).getUTCDate()
  const monthKey = `${safeYear}-${String(safeMonth).padStart(2, '0')}`

  return {
    startDate: `${monthKey}-01`,
    endDate: `${monthKey}-${String(lastDay).padStart(2, '0')}`,
  }
}

export async function getJournals(params) {
  return getJournalEntries(params)
}

export async function getJournalEntries({ startDate, endDate } = {}) {
  const fallbackRange = getJournalMonthRange(startDate || endDate)
  const resolvedStartDate = startDate || fallbackRange.startDate
  const resolvedEndDate = endDate || fallbackRange.endDate
  const searchParams = new URLSearchParams()
  searchParams.set('startDate', resolvedStartDate)
  searchParams.set('endDate', resolvedEndDate)

  if (USE_MOCK_JOURNAL) {
    const entries = (journalData.journals || []).filter(
      (journal) =>
        journal.journalDate >= resolvedStartDate && journal.journalDate <= resolvedEndDate,
    )
    return { entries: cloneMockData(entries) }
  }

  return await request(`/journal/entries?${searchParams.toString()}`)
}

export async function getCalendarActivity({ year, month, startDate, endDate } = {}) {
  const monthKey = year && month ? `${year}-${String(month).padStart(2, '0')}` : null
  if (USE_MOCK_JOURNAL) {
    return cloneMockData(
      (journalData.calendarActivity || []).filter(
        (activity) =>
          (!monthKey || activity.activityDate.startsWith(monthKey)) &&
          (!startDate || activity.activityDate >= startDate) &&
          (!endDate || activity.activityDate <= endDate),
      ),
    )
  }

  const trades = await getLedgerTradesForJournalRange(startDate, endDate)
  const tradeCountByDate = trades.reduce((counts, trade) => {
    const activityDate = trade.journalDate
    if (activityDate) counts.set(activityDate, (counts.get(activityDate) ?? 0) + 1)
    return counts
  }, new Map())

  return [...tradeCountByDate.entries()]
    .map(([activityDate, tradeCount]) => ({ activityDate, tradeCount }))
    .filter((activity) => !monthKey || activity.activityDate.startsWith(monthKey))
}

export async function getJournalById(journalId) {
  if (USE_MOCK_JOURNAL) {
    const entry = findDailyEntryByJournalId(journalId)
    if (entry) return cloneMockData(entry)
  }

  return await request(`/journal/entries/${journalId}`)
}

export async function getJournalEntryOnDate(journalDate = getDefaultJournalDate()) {
  if (USE_MOCK_JOURNAL) {
    const entry = findMockDailyEntry(journalDate) || {
      journalDate,
      canCreate: true,
      journal: null,
      trades: [],
    }
    return cloneMockData(entry)
  }

  const entryData = await request(`/journal/entries/on/${journalDate}`)

  if (entryData && (!entryData.trades || entryData.trades.length === 0)) {
    const ledgerTrades = await getLedgerTradesForJournalRange(journalDate, journalDate)
    if (ledgerTrades.length) {
      entryData.trades = ledgerTrades.map((trade) => ({
        tradeId: trade.tradeId,
        securityId: trade.securityId,
        securityCode: trade.securityCode,
        securityName: trade.securityName,
        tradeSide: trade.tradeSide,
        quantity: trade.quantity,
        unitPrice: trade.unitPrice,
        tradedAt: trade.tradedAt,
        note: null,
      }))
    }
  }

  return entryData
}

export async function createJournal(payload) {
  const journalDate = payload.journalDate || getDefaultJournalDate()

  if (USE_MOCK_JOURNAL) {
    let entry = findMockDailyEntry(journalDate)
    if (!entry) {
      entry = { journalDate, canCreate: true, journal: null, trades: [] }
      journalData.dailyEntries.push(entry)
    }

    const journalId =
      Math.max(0, ...(journalData.journals || []).map((journal) => Number(journal.journalId))) + 1
    const now = new Date().toISOString()
    entry.journal = {
      journalId,
      journalDate,
      marketThought: payload.marketThought || '',
      marketMood: payload.marketMood || null,
      createdAt: now,
      updatedAt: now,
    }
    entry.canCreate = false
    applyMockTradeNotes(entry, payload.tradeNotes)
    journalData.journals.unshift({
      ...entry.journal,
      tradeCount: entry.trades.length,
      tradeNoteCount: entry.trades.filter((trade) => trade.note?.rationaleText).length,
      trades: [],
    })
    return cloneMockData(entry.journal)
  }

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
}

export async function updateJournal(journalId, payload) {
  if (USE_MOCK_JOURNAL) {
    const entry = findDailyEntryByJournalId(journalId)
    if (!entry) throw new Error('수정할 목 투자일지를 찾을 수 없습니다.')

    entry.journal = {
      ...entry.journal,
      marketThought: payload.marketThought || '',
      marketMood: payload.marketMood || null,
      updatedAt: new Date().toISOString(),
    }
    applyMockTradeNotes(entry, payload.tradeNotes)
    return cloneMockData(entry.journal)
  }

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
