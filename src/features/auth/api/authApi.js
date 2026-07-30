import authData from '@/mocks/data/auth.json'

export async function getMe() {
  return authData.user
}

export async function loginWithOAuth(provider) {
  return {
    authorizationUrl: `/auth/oauth/${provider}/authorization`,
    user: authData.user,
    tokens: authData.tokens,
  }
}

export async function logout() {
  return true
}
