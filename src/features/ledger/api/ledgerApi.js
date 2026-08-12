import { request } from '@/shared/api/client'

const USE_MOCK_FALLBACK = import.meta.env.VITE_USE_MOCK_FALLBACK !== 'false'

export async function getLedgerTrades({
  accountId,
  securityId,
  tradeSide,
  from,
  to,
  page = 0,
  size = 20,
} = {}) {
  try {
    const searchParams = new URLSearchParams()
    if (accountId) searchParams.set('accountId', accountId)
    if (securityId) searchParams.set('securityId', securityId)
    if (tradeSide) searchParams.set('tradeSide', tradeSide)
    if (from) searchParams.set('from', from)
    if (to) searchParams.set('to', to)
    searchParams.set('page', page)
    searchParams.set('size', size)

    return await request(`/ledger/trades?${searchParams.toString()}`)
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API /ledger/trades 요청 실패, 빈 페이지를 반환합니다:', error)
    return {
      content: [],
      page,
      size,
      totalElements: 0,
      totalPages: 0,
      hasNext: false,
    }
  }
}

export async function getLedgerTradeDetail(tradeId) {
  try {
    return await request(`/ledger/trades/${tradeId}`)
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn(`API /ledger/trades/${tradeId} 요청 실패:`, error)
    throw error
  }
}

export async function getLedgerHoldings({ accountId, securityId } = {}) {
  try {
    const searchParams = new URLSearchParams()
    if (accountId) searchParams.set('accountId', accountId)
    if (securityId) searchParams.set('securityId', securityId)

    const query = searchParams.toString()
    return await request(`/ledger/holdings${query ? `?${query}` : ''}`)
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API /ledger/holdings 요청 실패, 빈 보유 목록을 반환합니다:', error)
    return {
      snapshotDate: null,
      summary: {
        holdingCount: 0,
        totalPurchaseAmount: 0,
        totalMarketValue: 0,
        totalProfitLossAmount: 0,
        totalReturnRate: 0,
      },
      holdings: [],
    }
  }
}
