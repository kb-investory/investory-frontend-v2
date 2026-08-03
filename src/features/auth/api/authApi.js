import authData from '@/mocks/data/auth.json'

export async function getMe() {
  return authData.user
}

export async function loginWithOAuth(provider) {
  await new Promise((resolve) => globalThis.setTimeout(resolve, 650))

  return {
    authorizationUrl: `/auth/oauth/${provider}/authorization`,
    user: {
      ...authData.user,
      oauthProvider: provider.toUpperCase(),
    },
    tokens: authData.tokens,
  }
}

export async function logout() {
  return true
}
