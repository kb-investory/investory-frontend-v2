import stockSearchData from '@/mocks/data/journal-stock-search.json'

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
