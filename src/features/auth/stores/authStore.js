import { defineStore } from 'pinia'
import { ref } from 'vue'

import { queryClient } from '@/app/providers/queryClient'
import { resetUserSession } from '@/app/services/resetUserSession'
import {
  getMe,
  loginWithOAuth,
  logout as logoutApi,
  withdrawAccount as withdrawAccountApi,
} from '@/features/auth/api/authApi'
import { refreshAccessToken } from '@/modules/auth/services/authService'
import { queryKeys } from '@/shared/api/queryKeys'

const USE_TEST_AUTH = import.meta.env.DEV && import.meta.env.VITE_USE_TEST_AUTH === 'true'
const TEST_AUTH_SESSION_KEY = 'investory:test-auth-user'

function readTestUser() {
  try {
    const storedUser = JSON.parse(window.sessionStorage.getItem(TEST_AUTH_SESSION_KEY) || 'null')
    return Number(storedUser?.userId) === 1 ? storedUser : null
  } catch {
    return null
  }
}

function writeTestUser(user) {
  window.sessionStorage.setItem(TEST_AUTH_SESSION_KEY, JSON.stringify(user))
}

function clearTestUser() {
  window.sessionStorage.removeItem(TEST_AUTH_SESSION_KEY)
}

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
      if (USE_TEST_AUTH) {
        user.value = readTestUser()
        isAuthenticated.value = Boolean(user.value)
        return user.value
      }

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
      if (USE_TEST_AUTH) {
        const testUser = {
          userId: 1,
          oauthProvider: provider.toUpperCase(),
          email: 'tester@investory.local',
          nickname: '테스트 사용자',
          userStatus: 'ACTIVE',
        }
        writeTestUser(testUser)
        user.value = testUser
        isAuthenticated.value = true
        initialized.value = true
        oauthStatus.value = 'success'
        oauthMessage.value = '테스트 로그인으로 시작합니다.'
        return { testMode: true, user: testUser }
      }

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
    if (USE_TEST_AUTH) {
      clearTestUser()
      await resetUserSession()
      resetAuthState()
      initialized.value = true
      return
    }

    try {
      await logoutApi()
    } finally {
      await resetUserSession()
      resetAuthState()
      initialized.value = true
    }
  }

  async function withdrawAccount() {
    try {
      await withdrawAccountApi()
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
    withdrawAccount,
  }
})
