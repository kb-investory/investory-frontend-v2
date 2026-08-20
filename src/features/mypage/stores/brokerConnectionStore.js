import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { queryClient } from '@/app/providers/queryClient'
import {
  createBrokerConnection,
  getBrokerProviders,
  getConnectedHoldings,
} from '@/features/mypage/api/brokerConnectionApi'
import { queryKeys } from '@/shared/api/queryKeys'

const CONNECTION_SESSION_KEY = 'investory:broker-connection'
const PROVIDER_STALE_TIME = 5 * 60 * 1000
const CONNECTION_ERROR_MESSAGES = Object.freeze({
  BRK_007:
    '선택한 증권사와 로그인한 계정의 소속이 일치하지 않습니다. 선택한 증권사 계정으로 다시 로그인해 주세요.',
})

function getConnectionErrorMessage(error) {
  return (
    CONNECTION_ERROR_MESSAGES[error?.errorCode] ||
    (error instanceof Error ? error.message : '') ||
    '증권사 로그인 중 오류가 발생했습니다.'
  )
}

function readSavedConnection() {
  try {
    const saved = sessionStorage.getItem(CONNECTION_SESSION_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export const useBrokerConnectionStore = defineStore('brokerConnection', () => {
  const savedConnection = readSavedConnection()
  const providers = ref([])
  const selectedBroker = ref(savedConnection?.account ?? null)
  const connection = ref(savedConnection?.connection ?? null)
  const account = ref(savedConnection?.account ?? null)
  const holdings = ref(savedConnection?.holdings ?? [])
  const loading = ref(false)
  const error = ref(null)
  const connectionStatus = ref('idle')
  const connectionError = ref('')
  const holdingsLoading = ref(false)
  const holdingsError = ref(null)
  const connectionCompleted = ref(
    (savedConnection?.connection?.status === 'CONNECTED' ||
      savedConnection?.connection?.connectionStatus === 'CONNECTED') &&
      Boolean(savedConnection?.account),
  )
  let latestProviderRequestId = 0
  let pendingConnectionRequest = null

  const hasVerifiedConnection = computed(() => {
    const status = connection.value?.status || connection.value?.connectionStatus
    const connectionBrokerId = Number(connection.value?.brokerId)
    const selectedId = Number(selectedBroker.value?.brokerId)
    return status === 'CONNECTED' && connectionBrokerId === selectedId
  })
  const hasLoadedHoldings = computed(() => hasVerifiedConnection.value && Boolean(account.value))

  const totalValuation = computed(() =>
    holdings.value.reduce((total, holding) => total + Number(holding.valuationAmount || 0), 0),
  )

  async function fetchProviders(query = '') {
    const requestId = ++latestProviderRequestId
    loading.value = true
    error.value = null

    try {
      const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
      const response = await queryClient.fetchQuery({
        queryKey: queryKeys.mypage.brokerProviders(normalizedQuery),
        queryFn: () => getBrokerProviders({ query: normalizedQuery }),
        staleTime: PROVIDER_STALE_TIME,
      })
      if (requestId !== latestProviderRequestId) return response

      providers.value = response.providers

      if (selectedBroker.value) {
        selectedBroker.value =
          response.providers.find(
            (provider) => provider.brokerId === selectedBroker.value.brokerId,
          ) ?? selectedBroker.value
      }

      return response
    } catch (requestError) {
      if (requestId === latestProviderRequestId) {
        error.value = requestError
      }
      throw requestError
    } finally {
      if (requestId === latestProviderRequestId) {
        loading.value = false
      }
    }
  }

  function selectBroker(broker) {
    if (broker?.active === false) {
      return
    }

    selectedBroker.value = broker
    resetConnectionRequest()
  }

  async function connectBroker(credentials) {
    if (!selectedBroker.value) {
      throw new Error('증권사를 먼저 선택해 주세요.')
    }

    const brokerId = selectedBroker.value.brokerId

    if (pendingConnectionRequest) {
      if (pendingConnectionRequest.brokerId === brokerId) {
        return pendingConnectionRequest.promise
      }
      throw new Error('이전 증권사 연동 요청이 아직 처리 중이에요. 잠시 후 다시 시도해 주세요.')
    }

    connectionStatus.value = 'loading'
    connectionError.value = ''

    const promise = (async () => {
      try {
        connection.value = await createBrokerConnection({
          brokerId,
          ...credentials,
        })

        connectionStatus.value = 'success'
        return connection.value
      } catch (requestError) {
        connection.value = null
        connectionStatus.value = 'error'
        connectionError.value = getConnectionErrorMessage(requestError)
        throw requestError
      } finally {
        pendingConnectionRequest = null
      }
    })()

    pendingConnectionRequest = { brokerId, promise }
    return promise
  }

  async function fetchHoldings() {
    if (!hasVerifiedConnection.value) {
      throw new Error('증권사 로그인을 완료한 후 보유 종목을 확인해 주세요.')
    }

    holdingsLoading.value = true
    holdingsError.value = null

    try {
      const response = await getConnectedHoldings({
        connectionId: connection.value?.connectionId,
        brokerId: selectedBroker.value.brokerId,
        brokerCode: selectedBroker.value.brokerCode,
        brokerName: selectedBroker.value.brokerName,
      })
      account.value = response.account
      holdings.value = response.holdings
      return response
    } catch (requestError) {
      holdingsError.value = requestError
      throw requestError
    } finally {
      holdingsLoading.value = false
    }
  }

  function resetConnectionRequest() {
    connection.value = null
    connectionStatus.value = 'idle'
    connectionError.value = ''
  }

  async function completeConnection() {
    if (!hasLoadedHoldings.value) {
      throw new Error('보유 종목 확인을 완료한 후 계좌 연결을 마쳐 주세요.')
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.mypage.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.home.all }),
    ])
    connectionCompleted.value = true

    try {
      sessionStorage.setItem(
        CONNECTION_SESSION_KEY,
        JSON.stringify({
          connection: connection.value,
          account: account.value,
          holdings: holdings.value,
        }),
      )
    } catch {
      // 저장소를 사용할 수 없는 환경에서도 현재 실행 중인 상태는 유지합니다.
    }
  }

  function reset() {
    latestProviderRequestId += 1
    providers.value = []
    selectedBroker.value = null
    connection.value = null
    account.value = null
    holdings.value = []
    loading.value = false
    error.value = null
    connectionStatus.value = 'idle'
    connectionError.value = ''
    holdingsLoading.value = false
    holdingsError.value = null
    connectionCompleted.value = false
    queryClient.removeQueries({ queryKey: ['mypage', 'broker-providers'] })

    try {
      sessionStorage.removeItem(CONNECTION_SESSION_KEY)
    } catch {
      // 저장소를 사용할 수 없는 환경에서도 메모리 상태는 초기화합니다.
    }
  }

  return {
    providers,
    selectedBroker,
    connection,
    account,
    holdings,
    loading,
    error,
    connectionStatus,
    connectionError,
    holdingsLoading,
    holdingsError,
    connectionCompleted,
    hasVerifiedConnection,
    hasLoadedHoldings,
    totalValuation,
    fetchProviders,
    selectBroker,
    connectBroker,
    fetchHoldings,
    resetConnectionRequest,
    completeConnection,
    reset,
  }
})
