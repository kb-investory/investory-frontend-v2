import { request } from '@/shared/api/client'

export async function getBrokerProviders({ query = '' } = {}) {
  const data = await request('/broker/providers')
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery || !Array.isArray(data?.providers)) {
    return data
  }
  return {
    providers: data.providers.filter((provider) =>
      [provider.brokerCode, provider.brokerName].some((value) =>
        value?.toLowerCase().includes(normalizedQuery),
      ),
    ),
  }
}

export async function getBrokerConnections() {
  return await request('/broker/connections')
}

export async function createBrokerConnection({ brokerId, loginId, password }) {
  try {
    return await request('/broker/connections', {
      method: 'POST',
      body: JSON.stringify({
        brokerId: Number(brokerId),
        loginId: loginId.trim(),
        password,
      }),
    })
  } catch (error) {
    if (error?.errorCode !== 'BRK_002' && !error?.message?.includes('이미 연동된')) throw error

    const connectionsData = await getBrokerConnections()
    const existingConnection = connectionsData?.connections?.find(
      (connection) => Number(connection.brokerId) === Number(brokerId),
    )
    if (!existingConnection) throw error

    await syncBrokerConnection(existingConnection.connectionId)
    return existingConnection
  }
}

export async function getBrokerConnectionDetail(connectionId) {
  return await request(`/broker/connections/${connectionId}`)
}

export async function getBrokerConnectionAccounts(connectionId) {
  return await request(`/broker/connections/${connectionId}/accounts`)
}

export async function syncBrokerConnection(connectionId) {
  return await request(`/broker/connections/${connectionId}/sync`, {
    method: 'POST',
  })
}

export async function getBrokerAccounts() {
  return await request('/broker/accounts')
}

export async function getBrokerAccountDetail(accountId) {
  return await request(`/broker/accounts/${accountId}`)
}

export async function updateBrokerAccountName(accountId, accountName) {
  return await request(`/broker/accounts/${accountId}`, {
    method: 'PATCH',
    body: JSON.stringify({ accountName }),
  })
}

export async function getConnectedHoldings({
  connectionId,
  brokerId,
  brokerCode,
  brokerName,
  accountId,
} = {}) {
  const searchParams = new URLSearchParams()
  if (accountId) searchParams.set('accountId', accountId)
  const query = searchParams.toString()
  const [ledgerHoldingsData, connectionAccountsData] = await Promise.all([
    request(`/ledger/holdings${query ? `?${query}` : ''}`),
    connectionId ? request(`/broker/connections/${connectionId}/accounts`) : Promise.resolve(null),
  ])
  const holdings = ledgerHoldingsData?.holdings || []

  return {
    account: {
      brokerId: connectionAccountsData?.brokerId ?? Number(brokerId),
      brokerCode: brokerCode || '',
      brokerName: connectionAccountsData?.brokerName || brokerName || '',
      accountCount: connectionAccountsData?.accounts?.length ?? 0,
    },
    snapshotDate: ledgerHoldingsData?.snapshotDate || null,
    totalValuation:
      ledgerHoldingsData?.summary?.totalMarketValue ??
      holdings.reduce((total, holding) => total + Number(holding.marketValue || 0), 0),
    holdings: holdings.map((holding) => {
      const name = holding.securityName || holding.securityCode || '종목명 없음'
      const code = holding.securityCode || ''
      const averagePurchasePrice = holding.averagePurchasePrice ?? 0
      const valuationAmount = holding.marketValue ?? 0

      return {
        securityId: holding.securityId,
        securityCode: code,
        securityName: name,
        stockCode: code,
        stockName: name,
        name,
        quantity: holding.quantity,
        averagePurchasePrice,
        avgCost: averagePurchasePrice,
        currentPrice: holding.currentPrice ?? 0,
        valuationAmount,
        marketValue: valuationAmount,
        unrealizedProfitLoss: holding.profitLossAmount ?? 0,
        returnRate: holding.returnRate ?? 0,
      }
    }),
  }
}
