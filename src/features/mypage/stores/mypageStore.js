import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  disconnectBroker as disconnectBrokerApi,
  getConnectedAccounts,
  getConnectedAccountDetail,
  getMypageOverview,
  retryAccountSync,
  syncConnectedAccounts,
  syncConnectedAccount,
  updateUserProfile,
} from '@/features/mypage/api/mypageApi'
import { getJournalEntries } from '@/features/journal/api/journalApi'
import { getLatestTendencyAnalysis } from '@/features/tendency/api/tendencyApi'

const OAUTH_PROVIDER_LABELS = Object.freeze({
  KAKAO: '카카오',
  NAVER: '네이버',
  GOOGLE: 'Google',
})

export const useMypageStore = defineStore('mypage', () => {
  const profile = ref(null)
  const tendencyBadges = ref([])
  const recentSimulation = ref(null)
  const accounts = ref([])
  const accountDetail = ref(null)
  const appInfo = ref(null)
  const hasTendencyAnalysis = ref(false)
  const loading = ref(false)
  const savingProfile = ref(false)
  const syncing = ref(false)
  const syncingAccountDetail = ref(false)
  const retryingAccountId = ref(null)
  const lastSyncResult = ref(null)
  const error = ref(null)

  const healthyAccountCount = computed(
    () => accounts.value.filter((account) => account.status === 'CONNECTED').length,
  )
  const errorAccountCount = computed(
    () => accounts.value.filter((account) => account.status !== 'CONNECTED').length,
  )
  const lastSyncedAt = computed(() => {
    const dates = accounts.value
      .map((account) => new Date(account.lastSyncedAt).getTime())
      .filter(Number.isFinite)
    return dates.length ? new Date(Math.max(...dates)).toISOString() : null
  })

  async function fetchOverview({ force = false, authUser = null } = {}) {
    if (profile.value && !force) return
    loading.value = true
    error.value = null

    try {
      const [overview, analysis, journalResponse] = await Promise.all([
        getMypageOverview(),
        getLatestTendencyAnalysis(),
        getJournalEntries(),
      ])
      const oauthProvider = String(
        authUser?.oauthProvider || authUser?.socialType || overview.profile.oauthProvider || '',
      ).toUpperCase()
      profile.value = {
        ...overview.profile,
        ...(authUser
          ? {
              email: authUser.email || overview.profile.email,
            }
          : {}),
        oauthProvider,
        oauthProviderLabel: OAUTH_PROVIDER_LABELS[oauthProvider] || '소셜',
        totalJournalsCount: journalResponse.entries.length,
      }
      tendencyBadges.value = (analysis?.analysisResults || []).map((result) => ({
        code: result.dimension.code,
        label: result.type.name,
      }))
      recentSimulation.value = overview.recentSimulation
      accounts.value = overview.accounts
      appInfo.value = overview.appInfo
      hasTendencyAnalysis.value = Boolean(analysis)
    } catch (requestError) {
      error.value = requestError
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile() {
    await fetchOverview({ force: true })
  }

  async function saveProfile(payload) {
    savingProfile.value = true
    error.value = null
    try {
      profile.value = await updateUserProfile(payload)
      return profile.value
    } finally {
      savingProfile.value = false
    }
  }

  async function fetchAccounts() {
    const response = await getConnectedAccounts()
    accounts.value = response.accounts
  }

  async function fetchAccountDetail(accountId) {
    loading.value = true
    error.value = null
    try {
      accountDetail.value = await getConnectedAccountDetail(accountId)
      return accountDetail.value
    } catch (requestError) {
      error.value = requestError
      return null
    } finally {
      loading.value = false
    }
  }

  async function syncAccountDetail(accountId) {
    if (syncingAccountDetail.value) return accountDetail.value
    syncingAccountDetail.value = true
    error.value = null
    try {
      accountDetail.value = await syncConnectedAccount(accountId)
      await fetchAccounts()
      return accountDetail.value
    } catch (requestError) {
      error.value = requestError
      return null
    } finally {
      syncingAccountDetail.value = false
    }
  }

  async function syncAllAccounts() {
    if (syncing.value) return
    syncing.value = true
    error.value = null
    try {
      const response = await syncConnectedAccounts()
      accounts.value = response.accounts
      lastSyncResult.value = response
    } catch (requestError) {
      error.value = requestError
    } finally {
      syncing.value = false
    }
  }

  async function retryAccount(accountId) {
    if (retryingAccountId.value) return
    retryingAccountId.value = accountId
    try {
      const response = await retryAccountSync(accountId)
      accounts.value = response.accounts
    } finally {
      retryingAccountId.value = null
    }
  }

  async function disconnectBroker(brokerId) {
    const response = await disconnectBrokerApi(brokerId)
    accounts.value = response.accounts
    return response
  }

  return {
    profile,
    tendencyBadges,
    recentSimulation,
    accounts,
    accountDetail,
    appInfo,
    hasTendencyAnalysis,
    loading,
    savingProfile,
    syncing,
    syncingAccountDetail,
    retryingAccountId,
    lastSyncResult,
    error,
    healthyAccountCount,
    errorAccountCount,
    lastSyncedAt,
    fetchOverview,
    fetchProfile,
    saveProfile,
    fetchAccounts,
    fetchAccountDetail,
    syncAccountDetail,
    syncAllAccounts,
    retryAccount,
    disconnectBroker,
  }
})
