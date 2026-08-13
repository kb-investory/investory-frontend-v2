import { getApiUrl, request, setAccessToken } from '@/shared/api/client'

export function getOauthAuthorizationUrl({ provider, redirectUri }) {
  const searchParams = new URLSearchParams()
  if (redirectUri) {
    searchParams.set('redirectUri', redirectUri)
  }

  const queryString = searchParams.toString()
  const endpoint = `/auth/oauth/${encodeURIComponent(provider.toLowerCase())}/authorization${queryString ? `?${queryString}` : ''}`
  return getApiUrl(endpoint)
}

export async function refreshAccessToken() {
  const data = await request('/auth/token/refresh', {
    method: 'POST',
    withCredentials: true,
  })
  if (data?.accessToken) {
    setAccessToken(data.accessToken)
  }
  return data
}

export async function getMe() {
  return await request('/auth/me')
}

export async function logout() {
  try {
    await request('/auth/logout', {
      method: 'POST',
      withCredentials: true,
    })
  } finally {
    setAccessToken(null)
  }
}
