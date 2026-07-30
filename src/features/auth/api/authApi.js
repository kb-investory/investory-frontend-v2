export async function getMe() {
  return {
    userId: 1,
    oauthProvider: 'KAKAO',
    email: 'investor@investory.com',
    nickname: '성공투자자',
    userStatus: 'ACTIVE',
    createdAt: '2026-07-01T10:00:00+09:00',
  }
}

export async function loginWithOAuth(provider) {
  return {
    authorizationUrl: `/auth/oauth/${provider}/authorization`,
  }
}

export async function logout() {
  return true
}
