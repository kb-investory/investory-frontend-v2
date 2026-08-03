<script setup>
import LoginForm from '@/modules/auth/components/LoginForm.vue'
import { useAuthStore } from '@/modules/auth/stores/authStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import MobileStatusBar from '@/shared/components/MobileStatusBar.vue'

const authStore = useAuthStore()
</script>

<template>
  <section class="login-page">
    <div class="login-shell">
      <MobileStatusBar />

      <main class="login-content">
        <div class="brand-intro">
          <div class="brand-logo" aria-label="Investory">
            <span>Investory</span>
            <span class="brand-logo__dot" aria-hidden="true" />
          </div>

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
            @select="authStore.startOauthLogin"
          />

          <p
            v-if="authStore.oauthMessage"
            class="login-status"
            :class="`login-status--${authStore.oauthStatus}`"
            :role="authStore.oauthStatus === 'error' ? 'alert' : 'status'"
            aria-live="polite"
          >
            <AppIcon
              :class="{ 'login-status__spinner': authStore.oauthStatus === 'loading' }"
              :name="
                authStore.oauthStatus === 'loading'
                  ? 'loader-circle'
                  : authStore.oauthStatus === 'error'
                    ? 'triangle-alert'
                    : 'circle-check'
              "
              :size="16"
            />
            <span>{{ authStore.oauthMessage }}</span>
          </p>

          <div class="security-notice">
            <AppIcon name="shield-check" :size="15" />
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
  background: var(--color-background);
}

.login-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  gap: 48px;
  padding: 34px 20px 28px;
}

.brand-intro {
  display: grid;
  gap: 28px;
}

.brand-logo {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  gap: 7px;
  color: var(--color-heading);
  font-family: var(--font-brand);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.brand-logo__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
}

.welcome-message {
  display: flex;
  min-height: 112px;
  gap: 14px;
}

.welcome-message__line {
  width: 3px;
  flex: 0 0 3px;
  border-radius: 2px;
  background: var(--color-primary);
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
  color: var(--color-heading);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.5px;
  line-height: 34px;
}

.welcome-message p {
  margin-top: 10px;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 22px;
}

.social-login {
  display: grid;
  gap: 16px;
}

.social-login__header {
  display: grid;
  gap: 5px;
}

.social-login__header h2 {
  color: var(--color-heading);
  font-size: 20px;
  line-height: 1.4;
}

.social-login__header p {
  color: var(--color-text-muted);
  font-size: 12px;
}

.login-status {
  display: flex;
  min-height: 40px;
  align-items: center;
  gap: 7px;
  padding: 8px 11px;
  border-radius: 10px;
  font-size: 11px;
  line-height: 17px;
}

.login-status--loading {
  background: var(--color-primary-subtle);
  color: var(--color-primary-strong);
}

.login-status--success {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.login-status--error {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.login-status__spinner {
  animation: spin 700ms linear infinite;
}

.security-notice {
  display: flex;
  min-height: 40px;
  align-items: center;
  gap: 7px;
  padding: 0 11px;
  border-radius: 10px;
  background: var(--color-surface-subtle);
  color: var(--color-text-subtle);
  font-size: 10px;
  line-height: 1.4;
}

.terms-notice {
  color: var(--color-text-subtle);
  font-size: 11px;
  line-height: 17px;
  text-align: center;
}

@media (min-width: 600px) {
  .login-shell {
    border: 1px solid var(--color-border);
    border-radius: 24px;
    box-shadow: 0 24px 70px rgb(24 24 23 / 9%);
  }
}

@media (max-height: 760px) {
  .login-content {
    gap: 32px;
    padding-top: 24px;
  }

  .brand-intro {
    gap: 20px;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
