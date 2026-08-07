import {
  getMe as serviceGetMe,
  getOauthAuthorizationUrl,
  logout as serviceLogout,
} from '@/modules/auth/services/authService'
import authData from '@/mocks/data/auth.json'

export async function getMe() {
  return serviceGetMe()
}

export async function loginWithOAuth(provider) {
  const oauthProvider = provider.toUpperCase()
  window.localStorage.setItem('investory:mock:oauth-provider', oauthProvider)

  const authorizationUrl = getOauthAuthorizationUrl({
    provider,
    redirectUri: `${window.location.origin}/oauth/complete`,
  })

  return {
    authorizationUrl,
    user: {
      ...authData.user,
      socialType: oauthProvider,
      oauthProvider,
    },
    tokens: authData.tokens,
  }
}

export async function logout() {
  await serviceLogout()
  return true
}
