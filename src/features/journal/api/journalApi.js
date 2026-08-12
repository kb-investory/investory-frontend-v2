import journalData from '@/mocks/data/journal.json'
import { request } from '@/shared/api/client'

function formatLocalDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
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
  const entriesData = await getJournalEntries({ startDate, endDate })
  const monthKey = year && month ? `${year}-${String(month).padStart(2, '0')}` : null
  return (entriesData.entries || [])
    .map((entry) => ({
      activityDate: entry.journalDate,
      hasJournal: true,
      tradeCount: entry.tradeCount ?? 0,
    }))
    .filter((activity) => !monthKey || activity.activityDate.startsWith(monthKey))
}

export async function getJournalById(journalId) {
  return await request(`/journal/entries/${journalId}`)
}

export async function getJournalEntryOnDate(journalDate = getDefaultJournalDate()) {
  const entryData = await request(`/journal/entries/on/${journalDate}`)

  if (entryData && (!entryData.trades || entryData.trades.length === 0)) {
    const ledgerTradesData = await request(
      `/ledger/trades?from=${journalDate}&to=${journalDate}&size=100`,
    )
    if (ledgerTradesData?.content?.length) {
      entryData.trades = ledgerTradesData.content.map((trade) => ({
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
