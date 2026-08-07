<script setup>
import { ShieldCheck, TriangleAlert } from '@lucide/vue'
import { RouterLink, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import LoginForm from '@/features/auth/components/LoginForm.vue'
import { useAuthStore } from '@/features/auth/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

async function handleSocialLogin(provider) {
  const response = await authStore.startOauthLogin(provider)

  if (response) {
    router.push({ name: ROUTE_NAMES.BROKER_CONNECT })
  }
}
</script>

<template>
  <section class="login-page">
    <div class="login-shell">
      <main class="login-content">
        <div class="brand-intro">
          <RouterLink class="brand-logo-link" :to="{ name: ROUTE_NAMES.HOME }">
            <img
              class="brand-logo"
              src="/assets/logos/investory-logo.png"
              alt="Investory 홈으로 이동"
            />
          </RouterLink>

          <div class="welcome-message">
            <span class="welcome-message__line" aria-hidden="true" />
            <div>
              <h1>투자 결과보다,<br />판단의 과정을 기록하세요.</h1>
              <p>차분히 기록하고 돌아보는 투자 동반자</p>
            </div>
          </div>
        </div>

        <div class="social-login">
          <header class="social-login__header">
            <h2>소셜 계정으로 시작하기</h2>
            <p>사용 중인 계정으로 간편하게 시작할 수 있어요.</p>
          </header>

          <LoginForm
            :active-provider="authStore.activeProvider"
            :status="authStore.oauthStatus"
            :disabled="authStore.loading"
            @select="handleSocialLogin"
          />

          <p
            v-if="authStore.oauthStatus === 'error'"
            class="login-status"
            role="alert"
            aria-live="polite"
          >
            <TriangleAlert :size="16" />
            <span>{{ authStore.oauthMessage }}</span>
          </p>

          <div class="security-notice">
            <ShieldCheck :size="15" />
            <span>로그인 정보는 각 소셜 서비스에서 안전하게 관리돼요.</span>
          </div>

          <p class="terms-notice">
            계속하면 Investory 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
          </p>
        </div>
      </main>
    </div>
  </section>
</template>

<style scoped>
.login-page {
  display: grid;
  min-height: 100svh;
  place-items: center;
  background: var(--color-border-subtle);
}

.login-shell {
  display: flex;
  width: min(100%, 390px);
  min-height: min(844px, 100svh);
  flex-direction: column;
  overflow: hidden;
  background: #ffffff;
}

.login-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  gap: 48px;
  padding: 22px 20px 24px;
}

.brand-intro {
  display: grid;
  gap: 20px;
}

.brand-logo {
  display: block;
  width: 118px;
  height: 44px;
  border-radius: 8px;
  object-fit: contain;
  object-position: center;
}

.brand-logo-link {
  display: block;
  width: fit-content;
  border-radius: 8px;
}

.brand-logo-link:focus-visible {
  outline: 2px solid var(--brand-teal-deep);
  outline-offset: 2px;
}

.welcome-message {
  display: flex;
  min-height: 132px;
  align-items: center;
  gap: 15px;
  padding: 18px;
  border-radius: 12px;
  background: var(--slate-strong);
  box-shadow: 0 10px 20px rgb(38 58 67 / 14%);
}

.welcome-message__line {
  width: 3px;
  height: 94px;
  flex: 0 0 3px;
  border-radius: 2px;
  background: var(--brand-teal);
}

.welcome-message > div {
  min-width: 0;
  flex: 1;
}

.welcome-message h1,
.welcome-message p,
.social-login__header h2,
.social-login__header p,
.login-status,
.terms-notice {
  margin: 0;
}

.welcome-message h1 {
  color: #ffffff;
  font-family: var(--font-heading);
  font-size: var(--font-size-title-md);
  font-weight: 700;
  letter-spacing: -0.3px;
  line-height: 1.4;
}

.welcome-message p {
  margin-top: 8px;
  color: #dce6e9;
  font-size: var(--font-size-body);
  line-height: 1.4;
}

.social-login {
  display: grid;
  gap: 12px;
}

.social-login__header {
  display: grid;
  gap: 5px;
  margin-bottom: 3px;
}

.social-login__header h2 {
  font-family: var(--font-heading);
  font-size: var(--font-size-body);
  letter-spacing: -0.2px;
}

.social-login__header p {
  color: var(--color-text-muted);
  font-size: var(--font-size-caption);
}

.login-status {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--brand-red-soft);
  color: #d33a45;
  font-size: var(--font-size-caption);
  line-height: 1.4;
}

.security-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--brand-mist);
  color: var(--color-text-muted);
  font-size: var(--font-size-caption);
}

.security-notice svg {
  color: var(--brand-teal-deep);
}

.terms-notice {
  color: var(--color-text-subtle);
  font-size: var(--font-size-caption);
  line-height: 1.4;
  text-align: center;
}

@media (min-width: 600px) {
  .login-shell {
    border: 1px solid var(--color-border);
    border-radius: 24px;
    box-shadow: 0 24px 70px rgb(24 24 23 / 9%);
  }
}
</style>
