<script setup>
import LoginForm from '@/features/auth/components/LoginForm.vue'
import { useAuthStore } from '@/features/auth/stores/authStore'
import AppBar from '@/shared/components/navigation/AppBar.vue'

const authStore = useAuthStore()
</script>

<template>
  <div class="mobile-page">
    <AppBar title="로그인" :show-back="false" :show-close="false" />

    <div class="mobile-page__content">
      <div class="brand-intro">
        <h2>Investory</h2>
        <p>기록 · 분석 · 원칙을 위한 투자 서비스</p>
      </div>

      <LoginForm @submit="authStore.signIn" />

      <p v-if="authStore.user" class="welcome-message">
        {{ authStore.user.name || authStore.user.nickname }}님, 환영합니다.
      </p>
    </div>
  </div>
</template>

<style scoped>
.mobile-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mobile-page__content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-top: 20px;
}

.brand-intro {
  display: flex;
  flex-direction: column;
  gap: 6px;

  h2 {
    margin: 0;
    color: #18272d;
    font-family: var(--font-heading);
    font-size: 28px;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: #666662;
    font-family: var(--font-sans);
    font-size: 12px;
  }
}

.welcome-message {
  margin: 0;
  color: #087f7c;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 700;
}
</style>
