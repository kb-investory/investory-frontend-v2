import { defineStore } from 'pinia'
import { ref } from 'vue'

import { getMe, logout as logoutApi } from '@/features/auth/api/authApi'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isAuthenticated = ref(false)
  const loading = ref(false)

  async function fetchUser() {
    loading.value = true
    try {
      user.value = await getMe()
      isAuthenticated.value = true
    } catch {
      user.value = null
      isAuthenticated.value = false
    } finally {
      loading.value = false
    }
  }

  async function signIn(credentials) {
    user.value = {
      userId: 1,
      oauthProvider: 'KAKAO',
      email: credentials?.email || 'investor@investory.com',
      nickname: '성공투자자',
      userStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
    }
    isAuthenticated.value = true
  }

  async function signOut() {
    await logoutApi()
    user.value = null
    isAuthenticated.value = false
  }

  return {
    user,
    isAuthenticated,
    loading,
    fetchUser,
    signIn,
    signOut,
  }
})
