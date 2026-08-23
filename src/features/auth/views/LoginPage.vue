<script setup>
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import LoginForm from '@/features/auth/components/LoginForm.vue'
import { useAuthStore } from '@/features/auth/stores/authStore'

const authStore = useAuthStore()
const router = useRouter()

async function handleSocialLogin(provider) {
  const response = await authStore.startOauthLogin(provider)
  if (!response?.testMode) return

  await router.replace({ name: ROUTE_NAMES.BROKER_CONNECT })
}
</script>

<template>
  <section class="login-page">
    <div class="login-shell">
      <main class="login-content" aria-label="소셜 계정 로그인">
        <LoginForm
          :active-provider="authStore.activeProvider"
          :status="authStore.oauthStatus"
          :disabled="authStore.loading"
          @select="handleSocialLogin"
        />
      </main>
    </div>
  </section>
</template>

<style scoped>
.login-page {
  display: grid;
  min-height: 100svh;
  place-items: center;
  background: #e9eff0;
  animation: login-page-enter 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.login-shell {
  position: relative;
  width: min(100%, 390px);
  height: min(844px, 100svh);
  overflow: hidden;
  background:
    radial-gradient(circle at 20% 24%, rgb(21 184 180 / 22%), transparent 34%),
    radial-gradient(circle at 86% 76%, rgb(14 105 121 / 32%), transparent 38%),
    linear-gradient(155deg, #01131c 0%, #032a34 52%, #021820 100%);
}

.login-shell::before,
.login-shell::after {
  position: absolute;
  border-radius: 50%;
  content: '';
  filter: blur(54px);
  pointer-events: none;
}

.login-shell::before {
  top: 12%;
  left: -24%;
  width: 230px;
  height: 230px;
  background: rgb(36 216 207 / 16%);
}

.login-shell::after {
  right: -28%;
  bottom: 10%;
  width: 270px;
  height: 270px;
  background: rgb(9 88 110 / 28%);
}

.login-content {
  position: relative;
  z-index: 1;
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  padding: 24px 38px;
}

.login-content :deep(.login-form) {
  width: 100%;
  gap: 12px;
}

.login-content :deep(.social-button) {
  min-height: 54px;
  box-shadow:
    0 12px 24px rgb(0 0 0 / 24%),
    0 0 22px rgb(55 225 216 / 8%);
}

@keyframes login-page-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-page {
    animation: none;
  }
}

@media (min-width: 600px) {
  .login-shell {
    border: 1px solid rgb(105 226 220 / 16%);
    border-radius: 28px;
    box-shadow: 0 24px 70px rgb(4 23 30 / 24%);
  }
}
</style>
