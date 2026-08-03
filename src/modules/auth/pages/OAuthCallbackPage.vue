<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import { useAuthStore } from '@/modules/auth/stores/authStore'
import AppIcon from '@/shared/components/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const supportedProviders = ['naver', 'kakao', 'google']
let redirectTimer

const statusIcon = computed(() => {
  if (authStore.oauthStatus === 'success') {
    return 'circle-check'
  }

  if (authStore.oauthStatus === 'error') {
    return 'triangle-alert'
  }

  return 'loader-circle'
})

function getQueryValue(value) {
  return Array.isArray(value) ? value[0] : value
}

onMounted(async () => {
  const provider = String(route.params.provider)
  const code = getQueryValue(route.query.code)
  const state = getQueryValue(route.query.state)
  const oauthError = getQueryValue(route.query.error)
  const oauthErrorDescription = getQueryValue(route.query.error_description)

  if (!supportedProviders.includes(provider)) {
    authStore.setOauthFailure('지원하지 않는 소셜 로그인 서비스입니다.')
    return
  }

  if (oauthError) {
    authStore.setOauthFailure(oauthErrorDescription || '소셜 로그인이 취소되었습니다.')
    return
  }

  if (!code || !state) {
    authStore.setOauthFailure('로그인 결과에 필요한 정보가 없습니다.')
    return
  }

  const response = await authStore.completeOauthLogin({ provider, code, state })

  if (response) {
    redirectTimer = window.setTimeout(() => {
      router.replace({ name: ROUTE_NAMES.BROKER_CONNECT })
    }, 900)
  }
})

onBeforeUnmount(() => {
  window.clearTimeout(redirectTimer)
})
</script>

<template>
  <section class="callback-page">
    <div
      class="callback-card"
      :class="`callback-card--${authStore.oauthStatus}`"
      role="status"
      aria-live="polite"
    >
      <div class="callback-card__brand">
        <span>Investory</span>
        <span aria-hidden="true" />
      </div>

      <div class="callback-card__icon">
        <AppIcon
          :class="{ 'callback-card__spinner': authStore.oauthStatus === 'loading' }"
          :name="statusIcon"
          :size="30"
        />
      </div>

      <div class="callback-card__copy">
        <h1>
          {{
            authStore.oauthStatus === 'success'
              ? '로그인 완료'
              : authStore.oauthStatus === 'error'
                ? '로그인 실패'
                : '로그인 확인 중'
          }}
        </h1>
        <p>{{ authStore.oauthMessage || '로그인 결과를 확인하고 있어요.' }}</p>
      </div>

      <RouterLink
        v-if="authStore.oauthStatus === 'error'"
        class="callback-card__retry"
        :to="{ name: ROUTE_NAMES.LOGIN }"
        @click="authStore.resetOauthState"
      >
        로그인 화면으로 돌아가기
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.callback-page {
  display: grid;
  min-height: 100svh;
  place-items: center;
  padding: 20px;
  background: var(--color-background);
}

.callback-card {
  display: grid;
  width: min(100%, 390px);
  justify-items: center;
  gap: 24px;
  padding: 40px 28px;
  border: 1px solid var(--color-border);
  border-radius: 24px;
  background: var(--color-surface);
  box-shadow: 0 24px 70px rgb(24 24 23 / 8%);
  text-align: center;
}

.callback-card__brand {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-brand);
  font-size: 20px;
  font-weight: 700;
}

.callback-card__brand span:last-child {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-primary);
}

.callback-card__icon {
  display: grid;
  width: 64px;
  height: 64px;
  place-items: center;
  border-radius: 50%;
  background: var(--color-primary-subtle);
  color: var(--color-primary-strong);
}

.callback-card--success .callback-card__icon {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.callback-card--error .callback-card__icon {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.callback-card__copy {
  display: grid;
  gap: 8px;
}

.callback-card__copy h1,
.callback-card__copy p {
  margin: 0;
}

.callback-card__copy h1 {
  font-size: 24px;
}

.callback-card__copy p {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 22px;
}

.callback-card__retry {
  width: 100%;
  padding: 14px 18px;
  border-radius: 14px;
  background: var(--color-heading);
  color: var(--color-surface);
  font-size: 14px;
  font-weight: 700;
}

.callback-card__spinner {
  animation: spin 700ms linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
