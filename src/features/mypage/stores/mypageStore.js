import { defineStore } from 'pinia'
import { ref } from 'vue'

import { getProfile } from '@/features/mypage/api/mypageApi'

export const useMypageStore = defineStore('mypage', () => {
  const profile = ref(null)
  const loading = ref(false)

  async function fetchProfile() {
    loading.value = true
    try {
      profile.value = await getProfile()
    } finally {
      loading.value = false
    }
  }

  return {
    profile,
    loading,
    fetchProfile,
  }
})
