import { getApiUrl, request, setAccessToken } from '@/shared/api/client'

export { refreshAccessToken } from '@/shared/api/client'

export function getOauthAuthorizationUrl({ provider, redirectUri }) {
  const searchParams = new URLSearchParams()
  if (redirectUri) {
    searchParams.set('redirectUri', redirectUri)
  }

  const queryString = searchParams.toString()
  const endpoint = `/auth/oauth/${encodeURIComponent(provider.toLowerCase())}/authorization${queryString ? `?${queryString}` : ''}`
  return getApiUrl(endpoint)
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

export async function withdrawAccount() {
  try {
    await request('/auth/me', {
      method: 'DELETE',
      withCredentials: true,
    })
  } finally {
    setAccessToken(null)
  }
}
