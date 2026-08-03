import { defineStore } from 'pinia'
import { ref } from 'vue'

import { getMe, loginWithOAuth, logout as logoutApi } from '@/features/auth/api/authApi'
import { useBrokerConnectionStore } from '@/features/mypage/stores/brokerConnectionStore'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isAuthenticated = ref(false)
  const loading = ref(false)
  const activeProvider = ref(null)
  const oauthStatus = ref('idle')
  const oauthMessage = ref('')

  async function fetchUser() {
    loading.value = true
    try {
      user.value = await getMe()
      isAuthenticated.value = true
    } catch {
      user.value = null
      isAuthenticated.value = false
    } finally {
      loading.value = false
    }
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
      user.value = response.user
      isAuthenticated.value = true
      oauthStatus.value = 'success'
      oauthMessage.value = `${providerName} 로그인이 완료되었습니다.`
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
      const brokerStore = useBrokerConnectionStore()

      brokerStore.reset()
      user.value = null
      isAuthenticated.value = false
      activeProvider.value = null
      oauthStatus.value = 'idle'
      oauthMessage.value = ''
    }
  }

  return {
    user,
    isAuthenticated,
    loading,
    activeProvider,
    oauthStatus,
    oauthMessage,
    fetchUser,
    startOauthLogin,
    signOut,
  }
})
