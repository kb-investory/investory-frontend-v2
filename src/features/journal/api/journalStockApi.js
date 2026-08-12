import { getLedgerHoldings } from '@/features/ledger/api/ledgerApi'
import { searchSecurities } from '@/features/market/api/marketApi'
import { request } from '@/shared/api/client'

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

export async function getJournalStockSearchData() {
  const [securityData, holdingsData] = await Promise.all([
    searchSecurities({ size: 100 }),
    getLedgerHoldings(),
  ])
  const holdingMap = new Map(
    (holdingsData?.holdings || []).map((holding) => [holding.securityId, holding.quantity]),
  )

  return {
    stocks: (securityData?.securities || []).map((security) => ({
      ...security,
      holdingQuantity: holdingMap.get(security.securityId),
    })),
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
  if (!targetSecurityId && securityCode) {
    const securityData = await searchSecurities({ keyword: securityCode, size: 20 })
    targetSecurityId = securityData?.securities?.find(
      (security) => security.securityCode === securityCode,
    )?.securityId
  }
  if (!targetSecurityId) throw new Error('종목 정보를 찾을 수 없습니다.')

  const searchParams = new URLSearchParams()
  searchParams.set('securityId', targetSecurityId)
  if (startDate) searchParams.set('startDate', startDate)
  if (endDate) searchParams.set('endDate', endDate)
  searchParams.set('page', page)
  searchParams.set('size', size)

  return await request(`/journal/trades?${searchParams.toString()}`)
}
