import stockSearchData from '@/mocks/data/journal-stock-search.json'
import stockTimelineData from '@/mocks/data/journal-stock-timeline.json'

const RECENT_STOCKS_KEY = 'investory-journal-recent-stocks'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeKeyword(keyword) {
  return keyword.trim().toLocaleLowerCase('ko-KR').replaceAll(' ', '')
}

function readRecentSecurityCodes() {
  if (typeof window === 'undefined') {
    return stockSearchData.recentSecurityCodes
  }

  try {
    const storedCodes = JSON.parse(window.sessionStorage.getItem(RECENT_STOCKS_KEY))
    return Array.isArray(storedCodes) ? storedCodes : stockSearchData.recentSecurityCodes
  } catch {
    return stockSearchData.recentSecurityCodes
  }
}

export async function getJournalStockSearchData() {
  return clone({
    stocks: stockSearchData.stocks,
    recentSecurityCodes: readRecentSecurityCodes(),
  })
}

export async function searchJournalStocks(keyword) {
  const normalizedKeyword = normalizeKeyword(keyword)

  if (!normalizedKeyword) {
    return []
  }

  return clone(
    stockSearchData.stocks.filter((stock) => {
      const searchableText = [
        stock.securityName,
        stock.securityCode,
        ...(stock.searchAliases ?? []),
      ]
        .join('')
        .toLocaleLowerCase('ko-KR')
        .replaceAll(' ', '')

      return searchableText.includes(normalizedKeyword)
    }),
  )
}

export async function saveRecentJournalStock(securityCode) {
  const nextCodes = [
    securityCode,
    ...readRecentSecurityCodes().filter((code) => code !== securityCode),
  ].slice(0, 3)

  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(RECENT_STOCKS_KEY, JSON.stringify(nextCodes))
  }

  return clone(nextCodes)
}

export async function getJournalStockTimeline({
  securityCode,
  startDate,
  endDate,
  page = 0,
  size = 20,
}) {
  const stock = stockSearchData.stocks.find((item) => item.securityCode === securityCode)
  const timeline = stockTimelineData.stockTimelines[securityCode]

  if (!stock || !timeline) {
    throw new Error('종목 거래 일지를 찾을 수 없습니다.')
  }

  const filteredTrades = timeline.trades
    .filter((trade) => {
      const tradeDate = trade.tradedAt.slice(0, 10)

      if (startDate && tradeDate < startDate) {
        return false
      }

      if (endDate && tradeDate > endDate) {
        return false
      }

      return true
    })
    .sort((a, b) => b.tradedAt.localeCompare(a.tradedAt))

  const startIndex = page * size
  const pagedTrades = filteredTrades.slice(startIndex, startIndex + size)

  return clone({
    security: {
      securityId: stock.securityId,
      securityCode: stock.securityCode,
      securityName: stock.securityName,
      marketType: stock.marketType ?? 'KOSPI',
      brandKey: stock.brandKey,
    },
    holding: {
      firstPurchasedAt: timeline.firstPurchasedAt,
      currentQuantity: timeline.currentQuantity,
      cumulativeProfitAmount: timeline.cumulativeProfitAmount,
    },
    trades: pagedTrades,
    page,
    size,
    totalElements: filteredTrades.length,
    totalPages: Math.ceil(filteredTrades.length / size),
  })
}
