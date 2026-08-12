import {
  getMe as serviceGetMe,
  getOauthAuthorizationUrl,
  logout as serviceLogout,
} from '@/modules/auth/services/authService'
import authData from '@/mocks/data/auth.json'

const MOCK_OAUTH_PROVIDER_KEY = 'investory:mock:oauth-provider'

export async function getMe() {
  return serviceGetMe()
}

export async function loginWithOAuth(provider) {
  const oauthProvider = provider.toUpperCase()
  window.localStorage.setItem(MOCK_OAUTH_PROVIDER_KEY, oauthProvider)

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
  try {
    await serviceLogout()
  } finally {
    window.localStorage.removeItem(MOCK_OAUTH_PROVIDER_KEY)
  }
  return true
}
