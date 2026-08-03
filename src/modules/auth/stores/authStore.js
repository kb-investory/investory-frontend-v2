import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  completeOauth,
  getOauthAuthorizationUrl,
  logout,
  refreshAccessToken,
} from '@/modules/auth/services/authService'

const OAUTH_SESSION_KEY = 'investory:oauth-session'
const OAUTH_PROVIDER_NAMES = Object.freeze({
  naver: '네이버',
  kakao: '카카오',
  google: 'Google',
})

function getProviderName(provider) {
  return OAUTH_PROVIDER_NAMES[provider] ?? '소셜 서비스'
}

function createOauthState() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const randomValues = crypto.getRandomValues(new Uint32Array(4))
  return Array.from(randomValues, (value) => value.toString(16)).join('-')
}

function getRedirectUri(provider) {
  return `${window.location.origin}/auth/callback/${provider}`
}

function saveOauthSession(session) {
  sessionStorage.setItem(OAUTH_SESSION_KEY, JSON.stringify(session))
}

function readOauthSession() {
  const savedSession = sessionStorage.getItem(OAUTH_SESSION_KEY)

  if (!savedSession) {
    return null
  }

  try {
    return JSON.parse(savedSession)
  } catch {
    return null
  }
}

function assertSafeAuthorizationUrl(authorizationUrl) {
  const targetUrl = new URL(authorizationUrl, window.location.origin)

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    throw new Error('안전하지 않은 로그인 주소입니다.')
  }

  return targetUrl.toString()
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const tokens = ref(null)
  const loading = ref(false)
  const activeProvider = ref(null)
  const oauthStatus = ref('idle')
  const oauthMessage = ref('')
  const error = ref(null)

  async function startOauthLogin(provider) {
    if (loading.value) {
      return null
    }

    const providerName = getProviderName(provider)
    const redirectUri = getRedirectUri(provider)
    const state = createOauthState()

    loading.value = true
    activeProvider.value = provider
    oauthStatus.value = 'loading'
    oauthMessage.value = `${providerName} 로그인 페이지를 준비하고 있어요.`
    error.value = null
    saveOauthSession({ provider, state, redirectUri })

    try {
      const response = await getOauthAuthorizationUrl({ provider, redirectUri, state })
      const authorizationUrl = assertSafeAuthorizationUrl(response.authorizationUrl)

      oauthStatus.value = 'success'
      oauthMessage.value = `${providerName} 로그인 페이지로 이동합니다.`

      window.setTimeout(() => {
        loading.value = false
        window.location.assign(authorizationUrl)
      }, 450)

      return response
    } catch (requestError) {
      error.value = requestError
      oauthStatus.value = 'error'
      oauthMessage.value = `${providerName} 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.`
      loading.value = false
      return null
    }
  }

  async function completeOauthLogin({ provider, code, state }) {
    const providerName = getProviderName(provider)
    const savedSession = readOauthSession()

    loading.value = true
    activeProvider.value = provider
    oauthStatus.value = 'loading'
    oauthMessage.value = `${providerName} 로그인 결과를 확인하고 있어요.`
    error.value = null

    try {
      if (!savedSession || savedSession.provider !== provider || savedSession.state !== state) {
        throw new Error('로그인 요청 정보가 일치하지 않습니다.')
      }

      const response = await completeOauth({
        provider,
        code,
        state,
        redirectUri: savedSession.redirectUri,
      })
      const { user: signedInUser, ...issuedTokens } = response

      user.value = signedInUser ?? null
      tokens.value = issuedTokens
      oauthStatus.value = 'success'
      oauthMessage.value = `${providerName} 로그인이 완료되었습니다.`
      sessionStorage.removeItem(OAUTH_SESSION_KEY)

      return response
    } catch (requestError) {
      error.value = requestError
      oauthStatus.value = 'error'
      oauthMessage.value = `${providerName} 로그인에 실패했습니다. 다시 시도해 주세요.`
      return null
    } finally {
      loading.value = false
    }
  }

  function setOauthFailure(message) {
    loading.value = false
    oauthStatus.value = 'error'
    oauthMessage.value = message
    error.value = new Error(message)
  }

  function resetOauthState() {
    loading.value = false
    activeProvider.value = null
    oauthStatus.value = 'idle'
    oauthMessage.value = ''
    error.value = null
  }

  async function refreshTokens() {
    tokens.value = await refreshAccessToken(tokens.value?.refreshToken)
    return tokens.value
  }

  async function signOut() {
    const response = await logout(tokens.value?.refreshToken)
    user.value = null
    tokens.value = null
    resetOauthState()
    return response
  }

  return {
    user,
    tokens,
    loading,
    activeProvider,
    oauthStatus,
    oauthMessage,
    error,
    startOauthLogin,
    completeOauthLogin,
    setOauthFailure,
    resetOauthState,
    refreshTokens,
    signOut,
  }
})
