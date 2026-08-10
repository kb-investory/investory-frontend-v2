import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { queryClient } from '@/app/providers/queryClient'
import {
  disconnectBroker as disconnectBrokerApi,
  getConnectedAccounts,
  getConnectedAccountDetail,
  getMypageOverview,
  getProfile,
  retryAccountSync,
  syncConnectedAccounts,
  syncConnectedAccount,
  updateUserProfile,
} from '@/features/mypage/api/mypageApi'
import { getJournalEntries } from '@/features/journal/api/journalApi'
import { getLatestCompletedSimulationResult } from '@/features/simulation/api/simulationApi'
import { getLatestTendencyAnalysis } from '@/features/tendency/api/tendencyApi'
import { queryKeys } from '@/shared/api/queryKeys'

const MYPAGE_STALE_TIME = 60 * 1000

async function invalidateAccountQueries() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.mypage.overview(), exact: true }),
    queryClient.invalidateQueries({ queryKey: queryKeys.home.all }),
  ])
}

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
  const loadingAccountDetail = ref(false)
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
    loading.value = true
    error.value = null

    try {
      if (force) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.mypage.overview(), exact: true })
      }

      const { overview, analysis, journalResponse, simulationResult } =
        await queryClient.fetchQuery({
          queryKey: queryKeys.mypage.overview(),
          queryFn: async () => {
            const [overviewData, analysisData, journalsData, simulationData] = await Promise.all([
              getMypageOverview(),
              queryClient.fetchQuery({
                queryKey: queryKeys.tendency.analysis(),
                queryFn: getLatestTendencyAnalysis,
                staleTime: MYPAGE_STALE_TIME,
              }),
              queryClient.fetchQuery({
                queryKey: queryKeys.journal.entries(),
                queryFn: () => getJournalEntries(),
                staleTime: MYPAGE_STALE_TIME,
              }),
              queryClient.fetchQuery({
                queryKey: queryKeys.simulation.latestCompleted(),
                queryFn: getLatestCompletedSimulationResult,
                staleTime: MYPAGE_STALE_TIME,
              }),
            ])

            return {
              overview: overviewData,
              analysis: analysisData,
              journalResponse: journalsData,
              simulationResult: simulationData,
            }
          },
          staleTime: MYPAGE_STALE_TIME,
        })
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
        group: result.dimension.group,
      }))
      const rankedParticipants = [...(simulationResult?.participantSummary || [])].sort(
        (first, second) => second.cumulativeReturnPercent - first.cumulativeReturnPercent,
      )
      const actualUserIndex = rankedParticipants.findIndex(
        (participant) => participant.variantType === 'ACTUAL_USER',
      )
      const actualUser = rankedParticipants[actualUserIndex]
      recentSimulation.value = actualUser
        ? {
            simulationId: simulationResult.simulationRun?.simulationRunId,
            rank: actualUserIndex + 1,
            participantCount: rankedParticipants.length,
            participants: rankedParticipants.map((participant, index) => ({
              rank: index + 1,
              variantId: participant.variantId,
              variantType: participant.variantType,
              variantName: participant.variantName,
              cumulativeReturnPercent: participant.cumulativeReturnPercent,
            })),
          }
        : null
      accounts.value = overview.accounts
      appInfo.value = overview.appInfo
      hasTendencyAnalysis.value = Boolean(analysis)
    } catch (requestError) {
      error.value = requestError
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile({ force = false } = {}) {
    if (force) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.mypage.profile(), exact: true })
    }

    profile.value = await queryClient.fetchQuery({
      queryKey: queryKeys.mypage.profile(),
      queryFn: getProfile,
      staleTime: MYPAGE_STALE_TIME,
    })
    return profile.value
  }

  async function saveProfile(payload) {
    savingProfile.value = true
    error.value = null
    try {
      profile.value = await updateUserProfile(payload)
      queryClient.setQueryData(queryKeys.mypage.profile(), profile.value)
      await queryClient.invalidateQueries({ queryKey: queryKeys.mypage.overview(), exact: true })
      return profile.value
    } finally {
      savingProfile.value = false
    }
  }

  async function fetchAccounts() {
    const response = await queryClient.fetchQuery({
      queryKey: queryKeys.mypage.accounts(),
      queryFn: getConnectedAccounts,
      staleTime: MYPAGE_STALE_TIME,
    })
    accounts.value = response.accounts
  }

  async function fetchAccountDetail(accountId) {
    loadingAccountDetail.value = true
    error.value = null
    try {
      accountDetail.value = await queryClient.fetchQuery({
        queryKey: queryKeys.mypage.accountDetail(accountId),
        queryFn: () => getConnectedAccountDetail(accountId),
        staleTime: MYPAGE_STALE_TIME,
      })
      return accountDetail.value
    } catch (requestError) {
      error.value = requestError
      return null
    } finally {
      loadingAccountDetail.value = false
    }
  }

  async function syncAccountDetail(accountId) {
    if (syncingAccountDetail.value) return accountDetail.value
    syncingAccountDetail.value = true
    error.value = null
    try {
      accountDetail.value = await syncConnectedAccount(accountId)
      accounts.value = accounts.value.map((account) =>
        account.accountId === Number(accountId)
          ? {
              ...account,
              status: accountDetail.value.status,
              statusLabel: accountDetail.value.statusLabel,
              lastSyncedAt: accountDetail.value.lastSyncedAt,
              syncErrorReason: accountDetail.value.syncErrorReason,
            }
          : account,
      )
      queryClient.setQueryData(queryKeys.mypage.accountDetail(accountId), accountDetail.value)
      queryClient.setQueryData(queryKeys.mypage.accounts(), { accounts: accounts.value })
      await invalidateAccountQueries()
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
      queryClient.setQueryData(queryKeys.mypage.accounts(), { accounts: accounts.value })
      lastSyncResult.value = response
      await invalidateAccountQueries()
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
      queryClient.setQueryData(queryKeys.mypage.accounts(), { accounts: accounts.value })
      await invalidateAccountQueries()
    } finally {
      retryingAccountId.value = null
    }
  }

  async function disconnectBroker(brokerId) {
    const response = await disconnectBrokerApi(brokerId)
    accounts.value = response.accounts
    queryClient.setQueryData(queryKeys.mypage.accounts(), { accounts: accounts.value })
    await invalidateAccountQueries()
    return response
  }

  function reset() {
    profile.value = null
    tendencyBadges.value = []
    recentSimulation.value = null
    accounts.value = []
    accountDetail.value = null
    appInfo.value = null
    hasTendencyAnalysis.value = false
    loading.value = false
    savingProfile.value = false
    syncing.value = false
    loadingAccountDetail.value = false
    syncingAccountDetail.value = false
    retryingAccountId.value = null
    lastSyncResult.value = null
    error.value = null
    queryClient.removeQueries({ queryKey: queryKeys.mypage.all })
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
    loadingAccountDetail,
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
    reset,
  }
})
