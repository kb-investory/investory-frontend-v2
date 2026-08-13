import { getLedgerHoldings, getLedgerTrades } from '@/features/ledger/api/ledgerApi'
import { getJournalById, getJournalEntries } from '@/features/journal/api/journalApi'
import { searchSecurities } from '@/features/market/api/marketApi'

const RECENT_STOCKS_KEY = 'investory-journal-recent-stocks'

function readRecentSecurityCodes() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const storedCodes = JSON.parse(window.sessionStorage.getItem(RECENT_STOCKS_KEY))
    return Array.isArray(storedCodes) ? storedCodes : []
  } catch {
    return []
  }
}

async function getTradeNotes(trades, securityId) {
  const tradeDates = trades
    .map((trade) => trade.tradedAt?.slice(0, 10))
    .filter(Boolean)
    .sort()

  if (!tradeDates.length) return new Map()

  try {
    const entriesData = await getJournalEntries({
      startDate: tradeDates[0],
      endDate: tradeDates.at(-1),
    })
    const entries = (entriesData?.entries || []).filter(
      (entry) => entry.tradeNoteCount == null || entry.tradeNoteCount > 0,
    )
    const detailResults = await Promise.allSettled(
      entries.map((entry) => getJournalById(entry.journalId)),
    )
    const notesByTradeId = new Map()

    detailResults.forEach((result, index) => {
      if (result.status !== 'fulfilled') return

      const entry = entries[index]
      const detailTrades = result.value?.trades || []
      detailTrades
        .filter((trade) => trade.securityId === securityId && trade.note?.rationaleText)
        .forEach((trade) => {
          notesByTradeId.set(trade.tradeId, {
            ...trade.note,
            journalId: entry.journalId,
            journalDate: entry.journalDate,
          })
        })
    })

    return notesByTradeId
  } catch {
    return new Map()
  }
}

export async function getJournalStockSearchData() {
  const [securityData, holdingsData] = await Promise.all([
    searchSecurities({ size: 100 }),
    getLedgerHoldings(),
  ])
  const securities = securityData?.securities || []
  const holdings = holdingsData?.holdings || []
  const securitiesById = new Map(securities.map((security) => [security.securityId, security]))
  const heldStocks = holdings.map((holding) => ({
    ...securitiesById.get(holding.securityId),
    ...holding,
    holdingQuantity: Number(holding.quantity ?? 0),
    returnRate: Number(holding.returnRate ?? 0),
  }))

  return {
    stocks: [...securities, ...heldStocks.filter((stock) => !securitiesById.has(stock.securityId))],
    heldStocks,
    recentSecurityCodes: readRecentSecurityCodes(),
  }
}

export async function searchJournalStocks(keyword) {
  if (!keyword.trim()) return []

  const response = await searchSecurities({ keyword: keyword.trim(), size: 50 })
  return response?.securities || []
}

export async function saveRecentJournalStock(securityCode) {
  const nextCodes = [
    securityCode,
    ...readRecentSecurityCodes().filter((code) => code !== securityCode),
  ].slice(0, 3)

  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(RECENT_STOCKS_KEY, JSON.stringify(nextCodes))
  }

  return nextCodes
}

export async function getJournalStockTimeline({
  securityId,
  securityCode,
  startDate,
  endDate,
  page = 0,
  size = 20,
}) {
  let targetSecurityId = securityId
  let targetSecurity = null
  if (!targetSecurityId && securityCode) {
    const securityData = await searchSecurities({ keyword: securityCode, size: 20 })
    targetSecurity = securityData?.securities?.find(
      (security) => security.securityCode === securityCode,
    )
    targetSecurityId = targetSecurity?.securityId
  }
  if (!targetSecurityId) throw new Error('종목 정보를 찾을 수 없습니다.')

  if (!targetSecurity) {
    const securityData = await searchSecurities({ keyword: String(targetSecurityId), size: 20 })
    targetSecurity = securityData?.securities?.find(
      (security) => security.securityId === targetSecurityId,
    )
  }

  const [tradeData, holdingsData] = await Promise.all([
    getLedgerTrades({
      securityId: targetSecurityId,
      from: startDate,
      to: endDate,
      page,
      size,
    }),
    getLedgerHoldings(),
  ])
  const ledgerTrades = tradeData?.content || []
  const notesByTradeId = await getTradeNotes(ledgerTrades, targetSecurityId)
  const trades = ledgerTrades.map((trade) => ({
    ...trade,
    note: trade.note ?? notesByTradeId.get(trade.tradeId) ?? null,
  }))
  const holdingData = (holdingsData?.holdings || []).find(
    (holding) => holding.securityId === targetSecurityId,
  )
  const firstPurchase = trades
    .filter((trade) => trade.tradeSide === 'BUY')
    .sort((a, b) => a.tradedAt.localeCompare(b.tradedAt))[0]
  const calculatedQuantity = trades.reduce(
    (quantity, trade) =>
      quantity + Number(trade.quantity ?? 0) * (trade.tradeSide === 'SELL' ? -1 : 1),
    0,
  )

  return {
    security: targetSecurity,
    holding: {
      firstPurchasedAt: firstPurchase?.tradedAt?.slice(0, 10) ?? null,
      currentQuantity: Number(holdingData?.quantity ?? calculatedQuantity),
      cumulativeProfitAmount: Number(holdingData?.profitLossAmount ?? 0),
    },
    trades,
    page: tradeData?.page ?? page,
    size: tradeData?.size ?? size,
    totalElements: tradeData?.totalElements ?? trades.length,
    totalPages: tradeData?.totalPages ?? 0,
  }
}
