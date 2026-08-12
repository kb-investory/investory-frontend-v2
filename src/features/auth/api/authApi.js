import {
  getMe as serviceGetMe,
  getOauthAuthorizationUrl,
  logout as serviceLogout,
} from '@/modules/auth/services/authService'

export async function getMe() {
  return serviceGetMe()
}

export async function loginWithOAuth(provider) {
  const authorizationUrl = getOauthAuthorizationUrl({
    provider,
    redirectUri: `${window.location.origin}/broker-connect`,
  })

  return { authorizationUrl }
}

export async function logout() {
  await serviceLogout()
  return true
}
