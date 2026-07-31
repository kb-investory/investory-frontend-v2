import onboardingData from '@/mocks/data/broker-onboarding.json'

const MOCK_REQUEST_DELAY = 700

function clone(value) {
  return structuredClone(value)
}

function waitForMockRequest() {
  return new Promise((resolve) => globalThis.setTimeout(resolve, MOCK_REQUEST_DELAY))
}

export async function getBrokerProviders({ query = '' } = {}) {
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

export async function createBrokerConnection({ brokerId, loginId, password }) {
  await waitForMockRequest()

  const provider = onboardingData.providers.find((item) => item.brokerId === Number(brokerId))

  if (!provider?.active) {
    throw new Error('선택한 증권사는 현재 연결할 수 없습니다.')
  }

  if (!loginId?.trim() || !password) {
    throw new Error('아이디와 비밀번호를 모두 입력해 주세요.')
  }

  if (loginId.trim().toLowerCase() === 'fail' || password.toLowerCase() === 'fail') {
    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.')
  }

  return {
    connectionId: Date.now(),
    status: 'CONNECTED',
    brokerId: provider.brokerId,
    brokerCode: provider.brokerCode,
    brokerName: provider.brokerName,
    connectedAt: new Date().toISOString(),
    syncResult: {
      accountCount: onboardingData.account.accountCount,
      holdingCount: onboardingData.holdings.length,
    },
  }
}

export async function getConnectedHoldings({ brokerId }) {
  const provider = onboardingData.providers.find((item) => item.brokerId === Number(brokerId))

  if (!provider) {
    throw new Error('연결된 증권사 정보를 확인할 수 없습니다.')
  }

  const holdings = clone(onboardingData.holdings)

  return {
    account: {
      brokerId: provider.brokerId,
      brokerCode: provider.brokerCode,
      brokerName: provider.brokerName,
      accountCount: onboardingData.account.accountCount,
    },
    reasonCount: onboardingData.account.reasonCount,
    totalValuation: holdings.reduce((total, holding) => total + holding.valuationAmount, 0),
    holdings,
  }
}
