import onboardingData from '@/mocks/data/broker-onboarding.json'
import { request } from '@/shared/api/client'

const USE_MOCK_FALLBACK = import.meta.env.VITE_USE_MOCK_FALLBACK !== 'false'

function clone(value) {
  return structuredClone(value)
}

export async function getBrokerProviders({ query = '' } = {}) {
  try {
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
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API /broker/providers 요청 실패, 목데이터를 사용합니다:', error)
    const normalizedQuery = query.trim().toLowerCase()
    const providers = normalizedQuery
      ? onboardingData.providers.filter((provider) =>
          [provider.brokerCode, provider.brokerName].some((value) =>
            value.toLowerCase().includes(normalizedQuery),
          ),
        )
      : onboardingData.providers

    return { providers: clone(providers) }
  }
}

export async function getBrokerConnections() {
  try {
    return await request('/broker/connections')
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API /broker/connections 요청 실패, 빈 목록을 반환합니다:', error)
    return { connections: [] }
  }
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
    // TODO: 백엔드가 TEMP_USER_ID=1L 하드코딩 사용 중이라 BRK_002(이미 연동된 증권사) 발생 시
    // 온보딩 흐름 테스트를 위해 임시로 성공 객체를 반환하여 다음 화면으로 넘어갑니다.
    const isAlreadyConnectedError =
      error?.errorCode === 'BRK_002' || error?.message?.includes('이미 연동된')

    if (!USE_MOCK_FALLBACK && !isAlreadyConnectedError) throw error

    console.warn(
      'API /broker/connections 요청 중 실패 또는 이미 연동됨(BRK_002) 발생. 임시 성공으로 처리하여 다음 단계로 이동합니다:',
      error,
    )
    const provider = onboardingData.providers.find((item) => item.brokerId === Number(brokerId))

    if (provider?.active === false) {
      throw new Error('선택한 증권사는 현재 연결할 수 없습니다.', { cause: error })
    }

    if (!loginId?.trim() || !password) {
      throw new Error('아이디와 비밀번호를 모두 입력해 주세요.', { cause: error })
    }

    return {
      connectionId: Date.now(),
      connectionStatus: 'CONNECTED',
      brokerId: provider?.brokerId ?? Number(brokerId),
      brokerCode: provider?.brokerCode ?? 'KB',
      brokerName: provider?.brokerName ?? 'KB증권',
      connectedAt: new Date().toISOString(),
      syncResult: {
        syncBatchId: Date.now(),
        syncStatus: 'SUCCESS',
        accountCount: onboardingData.account.accountCount,
        insertedTradeCount: 10,
        holdingCount: onboardingData.holdings.length,
      },
    }
  }
}

export async function getBrokerConnectionDetail(connectionId) {
  return await request(`/broker/connections/${connectionId}`)
}

export async function getBrokerConnectionAccounts(connectionId) {
  return await request(`/broker/connections/${connectionId}/accounts`)
}

export async function syncBrokerConnection(connectionId) {
  try {
    return await request(`/broker/connections/${connectionId}/sync`, {
      method: 'POST',
    })
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn(`API /broker/connections/${connectionId}/sync 요청 실패:`, error)
    return {
      syncBatchId: Date.now(),
      connectionId: Number(connectionId),
      syncStatus: 'SUCCESS',
      accountCount: 1,
      insertedTradeCount: 0,
      holdingCount: 4,
    }
  }
}

export async function getBrokerAccounts() {
  try {
    return await request('/broker/accounts')
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API /broker/accounts 요청 실패:', error)
    return {
      summary: { accountCount: 0, totalMarketValue: 0, totalUnrealizedPnl: 0 },
      accounts: [],
    }
  }
}

export async function getBrokerAccountDetail(accountId) {
  try {
    return await request(`/broker/accounts/${accountId}`)
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn(`API /broker/accounts/${accountId} 요청 실패:`, error)
    throw error
  }
}

export async function updateBrokerAccountName(accountId, accountName) {
  try {
    return await request(`/broker/accounts/${accountId}`, {
      method: 'PATCH',
      body: JSON.stringify({ accountName }),
    })
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn(`API PATCH /broker/accounts/${accountId} 요청 실패:`, error)
    return { accountId: Number(accountId), accountName }
  }
}

export async function getConnectedHoldings({ connectionId, brokerId, accountId } = {}) {
  try {
    const searchParams = new URLSearchParams()
    if (accountId) searchParams.set('accountId', accountId)
    const query = searchParams.toString()
    const ledgerHoldingsData = await request(`/ledger/holdings${query ? `?${query}` : ''}`)

    let accountInfo = null
    if (connectionId) {
      try {
        accountInfo = await request(`/broker/connections/${connectionId}/accounts`)
      } catch (err) {
        console.warn(`API /broker/connections/${connectionId}/accounts 조회 실패:`, err)
      }
    }

    const provider = onboardingData.providers.find((item) => item.brokerId === Number(brokerId))
    const holdings = ledgerHoldingsData?.holdings || []

    return {
      account: {
        brokerId: provider?.brokerId ?? Number(brokerId),
        brokerCode: provider?.brokerCode ?? accountInfo?.brokerCode ?? 'KB',
        brokerName: provider?.brokerName ?? accountInfo?.brokerName ?? 'KB증권',
        accountCount: accountInfo?.accounts?.length ?? onboardingData.account.accountCount,
      },
      reasonCount: holdings.length,
      snapshotDate: ledgerHoldingsData?.snapshotDate || null,
      totalValuation:
        ledgerHoldingsData?.summary?.totalMarketValue ??
        holdings.reduce((total, h) => total + (h.valuationAmount || h.marketValue || 0), 0),
      holdings: holdings.map((h) => {
        const name = h.securityName || h.stockName || h.name || '종목명 없음'
        const code = h.securityCode || h.stockCode || ''
        const avgCost = h.averagePurchasePrice ?? h.avgPrice ?? h.averageCost ?? 0
        const valuationAmount =
          h.valuationAmount ?? h.marketValue ?? h.quantity * (h.currentPrice || 0)

        return {
          securityId: h.securityId,
          securityCode: code,
          securityName: name,
          stockCode: code,
          stockName: name,
          name: name,
          quantity: h.quantity,
          averagePurchasePrice: avgCost,
          avgCost: avgCost,
          currentPrice: h.currentPrice ?? 0,
          valuationAmount: valuationAmount,
          marketValue: valuationAmount,
          unrealizedProfitLoss: h.unrealizedProfitLoss ?? h.profitLossAmount ?? 0,
          returnRate: h.returnRate ?? h.profitRate ?? 0,
        }
      }),
    }
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API /ledger/holdings 요청 실패, 온보딩 목데이터를 사용합니다:', error)
    const provider = onboardingData.providers.find((item) => item.brokerId === Number(brokerId))

    const holdings = clone(onboardingData.holdings)

    return {
      account: {
        brokerId: provider?.brokerId ?? Number(brokerId),
        brokerCode: provider?.brokerCode ?? 'KB',
        brokerName: provider?.brokerName ?? 'KB증권',
        accountCount: onboardingData.account.accountCount,
      },
      reasonCount: onboardingData.account.reasonCount,
      totalValuation: holdings.reduce((total, holding) => total + holding.valuationAmount, 0),
      holdings,
    }
  }
}
