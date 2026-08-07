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

export async function getConnectedHoldings({ brokerId }) {
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
