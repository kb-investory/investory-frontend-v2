<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft } from '@lucide/vue'

import { ROUTE_NAMES } from '@/app/router/route-names'
import { useMypageStore } from '@/modules/mypage/stores/mypageStore'
import BaseLoading from '@/shared/components/BaseLoading.vue'

const router = useRouter()
const mypageStore = useMypageStore()
const name = ref('')
const isSaving = ref(false)

onMounted(async () => {
  await mypageStore.fetchProfile()
  name.value = mypageStore.profile?.name || ''
})

async function saveProfile() {
  if (!name.value.trim() || isSaving.value) return

  isSaving.value = true
  await mypageStore.saveProfile({ name: name.value.trim() })
  router.replace({ name: ROUTE_NAMES.MYPAGE })
}
</script>

<template>
  <section class="subpage" aria-labelledby="profile-edit-title">
    <header class="subpage__header">
      <button type="button" aria-label="마이페이지로 돌아가기" @click="router.back()">
        <ChevronLeft :size="22" />
      </button>
      <h1 id="profile-edit-title">프로필 수정</h1>
      <span aria-hidden="true" />
    </header>

    <BaseLoading v-if="!mypageStore.profile" />
    <form v-else class="profile-form" @submit.prevent="saveProfile">
      <label for="profile-name">이름</label>
      <input id="profile-name" v-model="name" maxlength="20" autocomplete="name" />
      <label for="profile-email">이메일</label>
      <input id="profile-email" :value="mypageStore.profile.email" disabled />
      <button type="submit" :disabled="!name.trim() || isSaving">
        {{ isSaving ? '저장 중...' : '저장하기' }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.subpage {
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.subpage__header {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
}
.subpage__header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  text-align: center;
}
.subpage__header button {
  display: inline-flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.profile-form {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.profile-form label {
  margin-top: 10px;
  color: #666662;
  font-size: 13px;
  font-weight: 700;
}
.profile-form input {
  height: 48px;
  padding: 0 14px;
  border: 1px solid #deded9;
  border-radius: 10px;
  background: #fff;
  outline-color: #e8b931;
}
.profile-form input:disabled {
  background: #f6f6f3;
  color: #94948e;
}
.profile-form button[type='submit'] {
  height: 48px;
  margin-top: 20px;
  border: 0;
  border-radius: 10px;
  background: #181817;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}
.profile-form button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
