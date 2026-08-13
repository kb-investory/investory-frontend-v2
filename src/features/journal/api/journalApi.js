import journalData from '@/mocks/data/journal.json'
import { getLedgerTrades } from '@/features/ledger/api/ledgerApi'
import { request } from '@/shared/api/client'

const JOURNAL_TIME_ZONE = 'Asia/Seoul'
const JOURNAL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: JOURNAL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

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

  return [...(firstPage?.content || []), ...remainingResults.flatMap((result) => result?.content || [])]
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

export function getDefaultJournalDate() {
  return formatLocalDate(new Date())
}

export async function getJournals() {
  return getJournalEntries()
}

export async function getJournalEntries({ startDate, endDate } = {}) {
  const searchParams = new URLSearchParams()
  if (startDate) searchParams.set('startDate', startDate)
  if (endDate) searchParams.set('endDate', endDate)

  const query = searchParams.toString()
  return await request(`/journal/entries${query ? `?${query}` : ''}`)
}

export async function getCalendarActivity({ year, month, startDate, endDate } = {}) {
  const monthKey = year && month ? `${year}-${String(month).padStart(2, '0')}` : null
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
  return await request(`/journal/entries/${journalId}`)
}

export async function getJournalEntryOnDate(journalDate = getDefaultJournalDate()) {
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
