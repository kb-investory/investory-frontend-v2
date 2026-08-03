import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  createBrokerConnection,
  getBrokerConnection,
  getBrokers,
} from '@/shared/services/brokerService'

export const useBrokerStore = defineStore('broker', () => {
  const providers = ref([])
  const selectedProvider = ref(null)
  const selectedConnection = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function fetchBrokers(query) {
    loading.value = true
    error.value = null

    try {
      const response = await getBrokers({ query })
      providers.value = response.providers
      return response
    } catch (requestError) {
      error.value = requestError
      throw requestError
    } finally {
      loading.value = false
    }
  }

  function selectBroker(provider) {
    if (!provider?.active) {
      return
    }

    selectedProvider.value = provider
  }

  function clearSelectedBroker() {
    selectedProvider.value = null
  }

  async function connectBroker(payload) {
    const response = await createBrokerConnection(payload)

    if (response.connectionId) {
      selectedConnection.value = await getBrokerConnection(response.connectionId)
    }

    return response
  }

  async function fetchConnection(connectionId) {
    selectedConnection.value = await getBrokerConnection(connectionId)
    return selectedConnection.value
  }

  return {
    providers,
    selectedProvider,
    selectedConnection,
    loading,
    error,
    fetchBrokers,
    selectBroker,
    clearSelectedBroker,
    connectBroker,
    fetchConnection,
  }
})
