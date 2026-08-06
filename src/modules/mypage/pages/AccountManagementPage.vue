<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Building2, ChevronLeft } from '@lucide/vue'

import { useMypageStore } from '@/modules/mypage/stores/mypageStore'
import BaseLoading from '@/shared/components/BaseLoading.vue'

const router = useRouter()
const mypageStore = useMypageStore()

onMounted(() => mypageStore.fetchAccounts())
</script>

<template>
  <section class="subpage" aria-labelledby="account-management-title">
    <header class="subpage__header">
      <button type="button" aria-label="마이페이지로 돌아가기" @click="router.back()">
        <ChevronLeft :size="22" />
      </button>
      <h1 id="account-management-title">연결 계좌 관리</h1>
      <span aria-hidden="true" />
    </header>

    <BaseLoading v-if="mypageStore.accounts.length === 0" />
    <ul v-else class="account-list">
      <li v-for="account in mypageStore.accounts" :key="account.accountId" class="account-card">
        <Building2 :size="20" />
        <div>
          <strong>{{ account.displayName }}</strong>
          <span>{{ account.providerName }} · {{ account.accountNumberMasked }}</span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.subpage {
  display: flex;
  flex-direction: column;
  gap: 26px;
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
.account-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.account-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e8e8e3;
  border-radius: 14px;
  color: #6a6a64;
}
.account-card div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.account-card strong {
  color: #292926;
  font-size: 14px;
}
.account-card span {
  color: #94948e;
  font-size: 12px;
}
</style>
