import { request } from '@/shared/api/client'

export async function getLedgerTrades({
  accountId,
  securityId,
  tradeSide,
  from,
  to,
  page = 0,
  size = 20,
  skipGlobalLoading = false,
} = {}) {
  const searchParams = new URLSearchParams()
  if (accountId) searchParams.set('accountId', accountId)
  if (securityId) searchParams.set('securityId', securityId)
  if (tradeSide) searchParams.set('tradeSide', tradeSide)
  if (from) searchParams.set('from', from)
  if (to) searchParams.set('to', to)
  searchParams.set('page', page)
  searchParams.set('size', size)

  return await request(`/ledger/trades?${searchParams.toString()}`, { skipGlobalLoading })
}

export async function getLedgerTradeDetail(tradeId) {
  return await request(`/ledger/trades/${tradeId}`)
}

export async function getLedgerHoldings({ accountId, securityId } = {}) {
  const searchParams = new URLSearchParams()
  if (accountId) searchParams.set('accountId', accountId)
  if (securityId) searchParams.set('securityId', securityId)

  const query = searchParams.toString()
  return await request(`/ledger/holdings${query ? `?${query}` : ''}`)
}
