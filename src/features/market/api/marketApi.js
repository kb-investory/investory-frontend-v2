import { request } from '@/shared/api/client'

const USE_MOCK_FALLBACK = import.meta.env.VITE_USE_MOCK_FALLBACK !== 'false'

export async function searchSecurities({
  keyword = '',
  marketType = null,
  page = 0,
  size = 20,
} = {}) {
  try {
    const searchParams = new URLSearchParams()
    if (keyword?.trim()) searchParams.set('keyword', keyword.trim())
    if (marketType) searchParams.set('marketType', marketType)
    searchParams.set('page', Math.max(0, page))
    searchParams.set('size', Math.min(100, Math.max(1, size)))

    return await request(`/market/securities?${searchParams.toString()}`)
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API /market/securities 요청 실패, 빈 검색 결과를 반환합니다:', error)
    return {
      securities: [],
      page,
      size,
      totalElements: 0,
      totalPages: 0,
    }
  }
}

export async function getSecurityDetailById(securityId) {
  try {
    return await request(`/market/securities/${securityId}`)
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn(`API /market/securities/${securityId} 요청 실패:`, error)
    throw error
  }
}

export async function getSecurityMasterByStockCode(stockCode) {
  try {
    return await request(`/markets/securities/${encodeURIComponent(stockCode)}`)
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn(`API /markets/securities/${stockCode} 요청 실패:`, error)
    throw error
  }
}

export async function getSecurityPriceByDate(stockCode, date) {
  try {
    const searchParams = new URLSearchParams()
    if (date) searchParams.set('date', date)

    const query = searchParams.toString()
    return await request(
      `/markets/securities/${encodeURIComponent(stockCode)}/prices${query ? `?${query}` : ''}`,
    )
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn(`API /markets/securities/${stockCode}/prices 요청 실패:`, error)
    throw error
  }
}

export async function syncSecurityInfo(stockCode) {
  try {
    return await request(`/markets/securities/${encodeURIComponent(stockCode)}/sync-info`, {
      method: 'POST',
    })
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn(`API POST /markets/securities/${stockCode}/sync-info 요청 실패:`, error)
    throw error
  }
}

export async function syncSecurityPrice(stockCode) {
  try {
    return await request(`/markets/securities/${encodeURIComponent(stockCode)}/sync-price`, {
      method: 'POST',
    })
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn(`API POST /markets/securities/${stockCode}/sync-price 요청 실패:`, error)
    throw error
  }
}

export async function syncSecurityAll(stockCode) {
  try {
    return await request(`/markets/securities/${encodeURIComponent(stockCode)}/sync`, {
      method: 'POST',
    })
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn(`API POST /markets/securities/${stockCode}/sync 요청 실패:`, error)
    throw error
  }
}
