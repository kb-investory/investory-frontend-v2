import authData from '@/mocks/data/auth.json'

const MOCK_OAUTH_PROVIDER_KEY = 'investory:mock:oauth-provider'

export async function getMe() {
  const savedProvider = window.localStorage.getItem(MOCK_OAUTH_PROVIDER_KEY)

  if (!savedProvider) {
    throw new Error('로그인 세션이 없습니다.')
  }

  const socialType = savedProvider
  return { ...authData.user, socialType, oauthProvider: socialType }
}

export async function loginWithOAuth(provider) {
  await new Promise((resolve) => globalThis.setTimeout(resolve, 650))
  const oauthProvider = provider.toUpperCase()
  window.localStorage.setItem(MOCK_OAUTH_PROVIDER_KEY, oauthProvider)

  return {
    authorizationUrl: `/auth/oauth/${provider}/authorization`,
    user: {
      ...authData.user,
      socialType: oauthProvider,
      oauthProvider,
    },
    tokens: authData.tokens,
  }
}

export async function logout() {
  window.localStorage.removeItem(MOCK_OAUTH_PROVIDER_KEY)
  return true
}
