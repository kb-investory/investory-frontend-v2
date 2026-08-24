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

function unwrapJournalResponse(response) {
  let payload = response

  // API 공통 응답과 페이지 응답이 겹치면 data/result가 두 번 중첩될 수 있다.
  // 실제 도메인 객체나 목록에 도달할 때까지 제한적으로 벗긴다.
  for (let depth = 0; depth < 4; depth += 1) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) break
    const nested = payload.data ?? payload.result
    if (nested == null || nested === payload) break
    payload = nested
  }

  return payload
}

function isJournalRecord(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value.journalId != null ||
      value.journalDate != null ||
      value.marketMood != null ||
      value.marketThought != null),
  )
}

function normalizeTradeList(value) {
  const payload = unwrapJournalResponse(value)
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.content)) return payload.content
  if (Array.isArray(payload?.entries)) return payload.entries
  if (Array.isArray(payload?.trades)) return payload.trades
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

function normalizeLedgerTrade(trade) {
  const tradedAt =
    trade?.tradedAt ??
    trade?.traded_at ??
    trade?.executedAt ??
    trade?.executed_at ??
    trade?.tradeDateTime ??
    trade?.trade_date_time

  return {
    ...trade,
    tradeId: trade?.tradeId ?? trade?.trade_id ?? trade?.id,
    securityId: trade?.securityId ?? trade?.security_id,
    securityCode: trade?.securityCode ?? trade?.security_code ?? trade?.stockCode,
    securityName: trade?.securityName ?? trade?.security_name ?? trade?.stockName,
    tradeSide: trade?.tradeSide ?? trade?.trade_side ?? trade?.tradeType ?? trade?.side,
    quantity: trade?.quantity ?? trade?.tradeQuantity ?? trade?.trade_quantity,
    unitPrice: trade?.unitPrice ?? trade?.unit_price ?? trade?.tradePrice ?? trade?.price,
    tradedAt,
    journalDate: formatJournalDate(tradedAt),
  }
}

function normalizeJournalListResponse(response) {
  const payload = unwrapJournalResponse(response)
  const entries = Array.isArray(payload)
    ? payload
    : normalizeTradeList(payload?.entries ?? payload?.journals ?? payload?.content)

  return {
    ...(payload && !Array.isArray(payload) ? payload : {}),
    entries,
  }
}

function normalizeDailyEntryResponse(response, journalDate) {
  const payload = unwrapJournalResponse(response)
  if (!payload) {
    return { journalDate, canCreate: true, journal: null, trades: [] }
  }

  const nestedJournal = unwrapJournalResponse(payload.journal ?? payload.entry)
  const journal = isJournalRecord(nestedJournal)
    ? nestedJournal
    : isJournalRecord(payload)
      ? payload
      : null
  const resolvedDate = payload.journalDate ?? journal?.journalDate ?? journalDate
  const trades = normalizeTradeList(
    payload.trades ?? payload.tradeEntries ?? payload.ledgerTrades ?? journal?.trades,
  )

  return {
    ...(payload && !Array.isArray(payload) ? payload : {}),
    journalDate: resolvedDate,
    canCreate: payload.canCreate ?? !journal,
    journal: journal ? { ...journal, journalDate: journal.journalDate ?? resolvedDate } : null,
    trades,
  }
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
  const firstResponse = await getLedgerTrades({
    from: ledgerFrom,
    to: endDate,
    page: 0,
    size: 100,
    skipGlobalLoading: true,
  })
  const firstPage = unwrapJournalResponse(firstResponse) ?? {}
  const firstTrades = normalizeTradeList(firstPage)
  const totalPages =
    firstPage?.totalPages ??
    Math.max(1, Math.ceil(Number(firstPage?.totalElements ?? firstTrades.length) / 100))
  const remainingPages = Array.from(
    { length: Math.max(0, totalPages - 1) },
    (_, index) => index + 1,
  )
  const remainingResults = await Promise.all(
    remainingPages.map((page) =>
      getLedgerTrades({
        from: ledgerFrom,
        to: endDate,
        page,
        size: 100,
        skipGlobalLoading: true,
      }).then((response) => unwrapJournalResponse(response) ?? {}),
    ),
  )

  return [...firstTrades, ...remainingResults.flatMap((result) => normalizeTradeList(result))]
    .map(normalizeLedgerTrade)
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

  const response = await request(`/journal/entries?${searchParams.toString()}`, {
    skipGlobalLoading: true,
  })
  return normalizeJournalListResponse(response)
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
  const tradesByDate = trades.reduce((groups, trade) => {
    const activityDate = trade.journalDate
    if (!activityDate) return groups

    const dailyTrades = groups.get(activityDate) ?? []
    dailyTrades.push(trade)
    groups.set(activityDate, dailyTrades)
    return groups
  }, new Map())

  return [...tradesByDate.entries()]
    .map(([activityDate, dailyTrades]) => ({
      activityDate,
      tradeCount: dailyTrades.length,
      trades: dailyTrades,
    }))
    .filter((activity) => !monthKey || activity.activityDate.startsWith(monthKey))
}

export async function getJournalById(journalId) {
  if (USE_MOCK_JOURNAL) {
    const entry = findDailyEntryByJournalId(journalId)
    if (entry) return cloneMockData(entry)
  }

  const response = await request(`/journal/entries/${journalId}`, { skipGlobalLoading: true })
  const payload = unwrapJournalResponse(response)
  const journalDate = payload?.journalDate ?? payload?.journal?.journalDate
  return normalizeDailyEntryResponse(response, journalDate)
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

  // 일자별 일지와 거래 원장을 동시에 조회한다. 일지 응답이 거래 배열을
  // 생략하는 API 버전에서도 거래 패널을 즉시 채울 수 있고, 두 요청을
  // 순차 실행할 때 생기던 긴 대기 시간도 줄어든다.
  const [journalResult, ledgerResult] = await Promise.allSettled([
    request(`/journal/entries/on/${journalDate}`, {
      skipGlobalLoading: true,
    }),
    getLedgerTradesForJournalRange(journalDate, journalDate),
  ])
  const response = journalResult.status === 'fulfilled' ? journalResult.value : null
  const ledgerTrades = ledgerResult.status === 'fulfilled' ? ledgerResult.value : []

  // 일자별 일지 조회가 실패해도 거래 원장 조회가 성공했다면 거래 기록은
  // 그대로 반환한다. 작성된 일지 본문은 store가 월 목록/상세 API로 보완한다.
  if (journalResult.status === 'rejected' && ledgerResult.status === 'rejected') {
    throw journalResult.reason
  }

  const entryData = normalizeDailyEntryResponse(response, journalDate)

  if (entryData && entryData.trades.length === 0 && ledgerTrades.length) {
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
