import { request } from '@/shared/api/client'

export async function searchSecurities({
  keyword = '',
  marketType = null,
  page = 0,
  size = 20,
} = {}) {
  const searchParams = new URLSearchParams()
  if (keyword?.trim()) searchParams.set('keyword', keyword.trim())
  if (marketType) searchParams.set('marketType', marketType)
  searchParams.set('page', Math.max(0, page))
  searchParams.set('size', Math.min(100, Math.max(1, size)))

  return await request(`/market/securities?${searchParams.toString()}`)
}

export async function getSecurityDetailById(securityId) {
  return await request(`/market/securities/${securityId}`)
}

export async function getSecurityMasterBySecurityCode(securityCode) {
  return await request(`/market/securities/code/${encodeURIComponent(securityCode)}`)
}

export async function getSecurityPriceByDate(securityCode, date) {
  const searchParams = new URLSearchParams()
  if (date) searchParams.set('date', date)

  const query = searchParams.toString()
  return await request(
    `/market/securities/code/${encodeURIComponent(securityCode)}/prices${query ? `?${query}` : ''}`,
  )
}

export async function syncSecurityInfo(securityCode) {
  return await request(`/market/securities/code/${encodeURIComponent(securityCode)}/sync-info`, {
    method: 'POST',
  })
}

export async function syncSecurityPrice(securityCode) {
  return await request(`/market/securities/code/${encodeURIComponent(securityCode)}/sync-price`, {
    method: 'POST',
  })
}

export async function syncSecurityAll(securityCode) {
  return await request(`/market/securities/code/${encodeURIComponent(securityCode)}/sync`, {
    method: 'POST',
  })
}
