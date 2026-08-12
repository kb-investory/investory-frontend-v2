import { defineStore } from 'pinia'
import { ref } from 'vue'

import { queryClient } from '@/app/providers/queryClient'
import { resetUserSession } from '@/app/services/resetUserSession'
import { getMe, loginWithOAuth, logout as logoutApi } from '@/features/auth/api/authApi'
import { refreshAccessToken } from '@/modules/auth/services/authService'
import { queryKeys } from '@/shared/api/queryKeys'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isAuthenticated = ref(false)
  const initialized = ref(false)
  const loading = ref(false)
  const activeProvider = ref(null)
  const oauthStatus = ref('idle')
  const oauthMessage = ref('')

  let initializationPromise = null

  function resetAuthState() {
    user.value = null
    isAuthenticated.value = false
    activeProvider.value = null
    oauthStatus.value = 'idle'
    oauthMessage.value = ''
  }

  async function fetchUser({ force = false } = {}) {
    loading.value = true
    try {
      if (force) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser(), exact: true })
      }

      const fetchCurrentUser = async () => {
        try {
          return await getMe()
        } catch (error) {
          if (error?.status !== 401) throw error
          await refreshAccessToken()
          return await getMe()
        }
      }
      user.value = await queryClient.fetchQuery({
        queryKey: queryKeys.auth.currentUser(),
        queryFn: fetchCurrentUser,
        staleTime: 5 * 60 * 1000,
      })
      isAuthenticated.value = true
      return user.value
    } catch {
      resetAuthState()
      return null
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  async function initialize() {
    if (initialized.value) {
      return isAuthenticated.value
    }

    if (!initializationPromise) {
      initializationPromise = fetchUser().finally(() => {
        initializationPromise = null
      })
    }

    await initializationPromise
    return isAuthenticated.value
  }

  async function startOauthLogin(provider) {
    if (loading.value) {
      return null
    }

    const providerNames = {
      naver: '네이버',
      kakao: '카카오',
      google: 'Google',
    }
    const providerName = providerNames[provider] ?? '소셜 서비스'

    loading.value = true
    activeProvider.value = provider
    oauthStatus.value = 'loading'
    oauthMessage.value = `${providerName} 로그인을 진행하고 있어요.`

    try {
      const response = await loginWithOAuth(provider)
      oauthStatus.value = 'success'
      oauthMessage.value = `${providerName} 로그인 페이지로 이동합니다.`
      window.location.assign(response.authorizationUrl)
      return response
    } catch {
      user.value = null
      isAuthenticated.value = false
      oauthStatus.value = 'error'
      oauthMessage.value = `${providerName} 로그인에 실패했습니다. 다시 시도해 주세요.`
      return null
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    try {
      await logoutApi()
    } finally {
      await resetUserSession()
      resetAuthState()
      initialized.value = true
    }
  }

  return {
    user,
    isAuthenticated,
    initialized,
    loading,
    activeProvider,
    oauthStatus,
    oauthMessage,
    fetchUser,
    initialize,
    startOauthLogin,
    signOut,
  }
})
