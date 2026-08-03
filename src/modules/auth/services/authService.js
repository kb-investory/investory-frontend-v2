import { request } from '@/shared/api/client'

export function getOauthAuthorizationUrl({ provider, redirectUri, state }) {
  const searchParams = new URLSearchParams({ redirectUri, state })

  return request(`/auth/oauth/${encodeURIComponent(provider)}/authorize?${searchParams.toString()}`)
}

export function completeOauth({ provider, code, state, redirectUri }) {
  return request(`/auth/oauth/${encodeURIComponent(provider)}/callback`, {
    method: 'POST',
    body: JSON.stringify({ code, state, redirectUri }),
  })
}

export function refreshAccessToken(refreshToken) {
  return request('/auth/token/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
}

export function logout(refreshToken) {
  return request('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
}
