import { getLedgerHoldings } from '@/features/ledger/api/ledgerApi'
import { searchSecurities } from '@/features/market/api/marketApi'
import journalData from '@/mocks/data/journal.json'
import { request } from '@/shared/api/client'

const RECENT_STOCKS_KEY = 'investory-journal-recent-stocks'
const USE_MOCK_JOURNAL = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_JOURNAL === 'true'
const SEOUL_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function cloneMockData(value) {
  return JSON.parse(JSON.stringify(value))
}

function getSeoulDateKey(value) {
  return SEOUL_DATE_FORMATTER.format(new Date(value))
}

function getMockTradeTimeline({ securityId, startDate, endDate, page, size }) {
  const dailyTrades = (journalData.dailyEntries || []).flatMap((entry) => entry.trades || [])
  const uniqueTrades = new Map()

  ;[...(journalData.tradeHistory || []), ...dailyTrades].forEach((trade) => {
    if (Number(trade.securityId) === Number(securityId)) {
      uniqueTrades.set(trade.tradeId, trade)
    }
  })

  const matchingTrades = [...uniqueTrades.values()]
    .filter((trade) => {
      const tradedDate = getSeoulDateKey(trade.tradedAt)
      return (!startDate || tradedDate >= startDate) && (!endDate || tradedDate <= endDate)
    })
    .sort((a, b) => new Date(b.tradedAt) - new Date(a.tradedAt))
  const pageStart = page * size
  const trades = matchingTrades.slice(pageStart, pageStart + size)
  const securitySource = matchingTrades[0]

  return cloneMockData({
    security: securitySource
      ? {
          securityId: securitySource.securityId,
          securityCode: securitySource.securityCode,
          securityName: securitySource.securityName,
          marketType: securitySource.marketType || 'KOSPI',
        }
      : null,
    trades,
    page,
    size,
    totalElements: matchingTrades.length,
    totalPages: Math.ceil(matchingTrades.length / size),
  })
}

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

async function getTradeTimeline({ securityId, startDate, endDate, page, size }) {
  if (USE_MOCK_JOURNAL) {
    return getMockTradeTimeline({ securityId, startDate, endDate, page, size })
  }

  const searchParams = new URLSearchParams({
    securityId: String(securityId),
    page: String(page),
    size: String(size),
  })
  if (startDate) searchParams.set('startDate', startDate)
  if (endDate) searchParams.set('endDate', endDate)

  return await request(`/journal/trades?${searchParams.toString()}`)
}

export async function getJournalTradeHistory({ securityId, journalDate, size = 20 }) {
  const response = await getTradeTimeline({
    securityId,
    endDate: journalDate,
    page: 0,
    size,
  })

  return response?.trades || []
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
    if (USE_MOCK_JOURNAL) {
      const fixtureTrade = [
        ...(journalData.tradeHistory || []),
        ...(journalData.dailyEntries || []).flatMap((entry) => entry.trades || []),
      ].find((trade) => trade.securityCode === securityCode)
      targetSecurity = fixtureTrade
        ? {
            securityId: fixtureTrade.securityId,
            securityCode: fixtureTrade.securityCode,
            securityName: fixtureTrade.securityName,
            marketType: fixtureTrade.marketType || 'KOSPI',
          }
        : null
    } else {
      const securityData = await searchSecurities({ keyword: securityCode, size: 20 })
      targetSecurity = securityData?.securities?.find(
        (security) => security.securityCode === securityCode,
      )
    }
    targetSecurityId = targetSecurity?.securityId
  }
  if (!targetSecurityId) throw new Error('종목 정보를 찾을 수 없습니다.')

  if (!targetSecurity) {
    if (USE_MOCK_JOURNAL) {
      const fixtureTrade = (journalData.tradeHistory || []).find(
        (trade) => Number(trade.securityId) === Number(targetSecurityId),
      )
      targetSecurity = fixtureTrade
        ? {
            securityId: fixtureTrade.securityId,
            securityCode: fixtureTrade.securityCode,
            securityName: fixtureTrade.securityName,
            marketType: fixtureTrade.marketType || 'KOSPI',
          }
        : null
    } else {
      const securityData = await searchSecurities({ keyword: String(targetSecurityId), size: 20 })
      targetSecurity = securityData?.securities?.find(
        (security) => security.securityId === targetSecurityId,
      )
    }
  }

  const [tradeData, holdingsData] = await Promise.all([
    getTradeTimeline({
      securityId: targetSecurityId,
      startDate,
      endDate,
      page,
      size,
    }),
    USE_MOCK_JOURNAL ? Promise.resolve({ holdings: [] }) : getLedgerHoldings(),
  ])
  const trades = tradeData?.trades || []
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
    security: tradeData?.security ?? targetSecurity,
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
