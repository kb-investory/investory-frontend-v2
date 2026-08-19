<script setup>
import { ShieldCheck, TriangleAlert } from '@lucide/vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import LoginForm from '@/features/auth/components/LoginForm.vue'
import { useAuthStore } from '@/features/auth/stores/authStore'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

async function handleSocialLogin(provider) {
  const response = await authStore.startOauthLogin(provider)
  if (!response?.testMode) return

  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
  await router.push(redirect || { name: ROUTE_NAMES.BROKER_CONNECT })
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
              src="/assets/logos/investory-logo-dark.png"
              alt="Investory 홈으로 이동"
            />
          </RouterLink>

          <div class="welcome-message">
            <p>INVESTMENT JOURNAL</p>
            <h1>오늘의 판단을<br />기록으로 남겨보세요.</h1>
            <span aria-hidden="true" />
          </div>

        </div>

        <div class="social-login">
          <img
            class="card-sitters card-sitters--left"
            src="/assets/images/login-sitters-left.png"
            alt=""
            aria-hidden="true"
          />
          <img
            class="card-sitters card-sitters--right"
            src="/assets/images/login-sitters-right.png"
            alt=""
            aria-hidden="true"
          />

          <header class="social-login__header">
            <span aria-hidden="true" />
            <p>소셜 계정으로 계속하기</p>
            <span aria-hidden="true" />
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
  background: #031820;
}

.login-shell {
  display: flex;
  width: min(100%, 390px);
  min-height: min(844px, 100svh);
  flex-direction: column;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgb(0 17 25 / 48%) 0%, rgb(0 17 25 / 68%) 40%, rgb(0 17 25 / 86%) 100%),
    url('/assets/images/login-investment-bg.png') center / cover;
}

.login-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 26px 24px;
}

.brand-intro {
  display: grid;
  gap: 18px;
}

.brand-logo {
  display: block;
  width: 142px;
  height: 54px;
  object-fit: contain;
  object-position: left center;
}

.brand-logo-link {
  display: block;
  width: fit-content;
  border-radius: 8px;
}

.brand-logo-link:focus-visible {
  outline: 2px solid #5cebe4;
  outline-offset: 2px;
}

.welcome-message {
  display: grid;
  gap: 9px;
}

.welcome-message h1,
.welcome-message p,
.social-login__header p,
.login-status,
.terms-notice {
  margin: 0;
}

.welcome-message h1 {
  color: #ffffff;
  font-family: var(--font-heading);
  font-size: clamp(25px, 6.8vw, 30px);
  font-weight: 800;
  letter-spacing: -0.7px;
  line-height: 1.22;
}

.welcome-message p {
  color: #5cebe4;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.1px;
}

.welcome-message > span {
  width: 48px;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, #23d8d1 0 68%, rgb(35 216 209 / 30%) 68%);
}

.social-login {
  position: relative;
  display: grid;
  gap: 10px;
  margin-top: 48px;
  padding: 50px 18px 18px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 22px;
  background: rgb(1 24 32 / 62%);
  box-shadow: 0 16px 40px rgb(0 9 14 / 22%);
  backdrop-filter: blur(12px);
}

.card-sitters {
  position: absolute;
  z-index: 1;
  top: -72px;
  width: 116px;
  height: auto;
  filter: drop-shadow(0 10px 10px rgb(0 8 12 / 28%));
  pointer-events: none;
  user-select: none;
}

.card-sitters--left {
  left: 8px;
}

.card-sitters--right {
  right: 8px;
}

.social-login__header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.social-login__header p {
  color: rgb(255 255 255 / 74%);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.social-login__header span {
  height: 1px;
  background: rgb(255 255 255 / 20%);
}

.login-status {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgb(254 235 237 / 94%);
  color: #c43340;
  font-size: var(--font-size-caption);
  line-height: 1.4;
}

.security-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 2px 0;
  color: rgb(230 248 248 / 72%);
  font-size: 11px;
}

.security-notice svg {
  color: #5cebe4;
}

.terms-notice {
  color: rgb(230 248 248 / 56%);
  font-size: 11px;
  line-height: 1.4;
  text-align: center;
}

@media (min-width: 600px) {
  .login-shell {
    border: 1px solid rgb(255 255 255 / 12%);
    border-radius: 24px;
    box-shadow: 0 24px 70px rgb(24 24 23 / 9%);
  }
}
</style>
