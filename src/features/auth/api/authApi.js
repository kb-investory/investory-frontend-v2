import authData from '@/mocks/data/auth.json'

export async function getMe() {
  const savedProvider = window.localStorage.getItem('investory:mock:oauth-provider')
  const socialType = savedProvider || authData.user.socialType
  return { ...authData.user, socialType, oauthProvider: socialType }
}

export async function loginWithOAuth(provider) {
  await new Promise((resolve) => globalThis.setTimeout(resolve, 650))
  const oauthProvider = provider.toUpperCase()
  window.localStorage.setItem('investory:mock:oauth-provider', oauthProvider)

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
  return true
}
