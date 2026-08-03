import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  createBrokerConnection,
  getBrokerProviders,
  getConnectedHoldings,
} from '@/features/mypage/api/brokerConnectionApi'

const CONNECTION_SESSION_KEY = 'investory:broker-connection'

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
  const reasonCount = ref(savedConnection?.reasonCount ?? 0)
  const loading = ref(false)
  const error = ref(null)
  const connectionStatus = ref('idle')
  const connectionError = ref('')
  const holdingsLoading = ref(false)
  const holdingsError = ref(null)
  const connectionCompleted = ref(
    savedConnection?.connection?.status === 'CONNECTED' && Boolean(savedConnection?.account),
  )

  const hasVerifiedConnection = computed(
    () =>
      connection.value?.status === 'CONNECTED' &&
      connection.value.brokerId === selectedBroker.value?.brokerId,
  )
  const hasLoadedHoldings = computed(() => hasVerifiedConnection.value && Boolean(account.value))

  const totalValuation = computed(() =>
    holdings.value.reduce((total, holding) => total + holding.valuationAmount, 0),
  )

  async function fetchProviders(query = '') {
    loading.value = true
    error.value = null

    try {
      const response = await getBrokerProviders({ query })
      providers.value = response.providers

      if (selectedBroker.value) {
        selectedBroker.value =
          response.providers.find(
            (provider) => provider.brokerId === selectedBroker.value.brokerId,
          ) ?? selectedBroker.value
      }

      return response
    } catch (requestError) {
      error.value = requestError
      throw requestError
    } finally {
      loading.value = false
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

    connectionStatus.value = 'loading'
    connectionError.value = ''

    try {
      connection.value = await createBrokerConnection({
        brokerId: selectedBroker.value.brokerId,
        ...credentials,
      })
      connectionStatus.value = 'success'
      return connection.value
    } catch (requestError) {
      connection.value = null
      connectionStatus.value = 'error'
      connectionError.value =
        requestError instanceof Error
          ? requestError.message
          : '증권사 로그인 중 오류가 발생했습니다.'
      throw requestError
    }
  }

  async function fetchHoldings() {
    if (!hasVerifiedConnection.value) {
      throw new Error('증권사 로그인을 완료한 후 보유 종목을 확인해 주세요.')
    }

    holdingsLoading.value = true
    holdingsError.value = null

    try {
      const response = await getConnectedHoldings({
        brokerId: selectedBroker.value.brokerId,
      })
      account.value = response.account
      holdings.value = response.holdings
      reasonCount.value = response.reasonCount
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

  function completeConnection() {
    if (!hasLoadedHoldings.value) {
      throw new Error('보유 종목 확인을 완료한 후 계좌 연결을 마쳐 주세요.')
    }

    connectionCompleted.value = true

    try {
      sessionStorage.setItem(
        CONNECTION_SESSION_KEY,
        JSON.stringify({
          connection: connection.value,
          account: account.value,
          holdings: holdings.value,
          reasonCount: reasonCount.value,
        }),
      )
    } catch {
      // 저장소를 사용할 수 없는 환경에서도 현재 실행 중인 상태는 유지합니다.
    }
  }

  function reset() {
    providers.value = []
    selectedBroker.value = null
    connection.value = null
    account.value = null
    holdings.value = []
    reasonCount.value = 0
    loading.value = false
    error.value = null
    connectionStatus.value = 'idle'
    connectionError.value = ''
    holdingsLoading.value = false
    holdingsError.value = null
    connectionCompleted.value = false

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
    reasonCount,
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
