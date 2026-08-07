import authData from '@/mocks/data/auth.json'
import { request, setAccessToken } from '@/shared/api/client'

const USE_MOCK_FALLBACK = import.meta.env.VITE_USE_MOCK_FALLBACK !== 'false'

export function getOauthAuthorizationUrl({ provider, redirectUri }) {
  const searchParams = new URLSearchParams()
  if (redirectUri) {
    searchParams.set('redirectUri', redirectUri)
  }

  const queryString = searchParams.toString()
  const endpoint = `/auth/oauth/${encodeURIComponent(provider.toLowerCase())}/authorization${queryString ? `?${queryString}` : ''}`
  return endpoint
}

export async function refreshAccessToken() {
  try {
    const data = await request('/auth/token/refresh', {
      method: 'POST',
      withCredentials: true,
    })
    if (data?.accessToken) {
      setAccessToken(data.accessToken)
    }
    return data
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API /auth/token/refresh 요청 실패, 목데이터 토큰을 사용합니다:', error)
    setAccessToken(authData.tokens.accessToken)
    return authData.tokens
  }
}

export async function getMe() {
  try {
    return await request('/auth/me')
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API /auth/me 요청 실패, 목데이터 유저를 사용합니다:', error)
    const savedProvider = window.localStorage.getItem('investory:mock:oauth-provider')
    const socialType = savedProvider || authData.user.socialType
    return { ...authData.user, socialType, oauthProvider: socialType }
  }
}

export async function logout() {
  try {
    await request('/auth/logout', {
      method: 'POST',
      withCredentials: true,
    })
  } catch (error) {
    if (!USE_MOCK_FALLBACK) throw error
    console.warn('API /auth/logout 요청 실패:', error)
  } finally {
    setAccessToken(null)
  }
}
