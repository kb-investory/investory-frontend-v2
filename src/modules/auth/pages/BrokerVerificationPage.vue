<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import OnboardingHeader from '@/modules/auth/components/OnboardingHeader.vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import MobileStatusBar from '@/shared/components/MobileStatusBar.vue'
import { useBrokerStore } from '@/shared/stores/brokerStore'

const route = useRoute()
const router = useRouter()
const brokerStore = useBrokerStore()
const providerId = Number(route.query.providerId)

const selectedBroker = computed(
  () =>
    brokerStore.selectedProvider ??
    brokerStore.providers.find((provider) => provider.providerId === providerId) ??
    null,
)

onMounted(async () => {
  if (!brokerStore.providers.length) {
    await brokerStore.fetchBrokers()
  }

  const provider = brokerStore.providers.find((item) => item.providerId === providerId)

  if (provider) {
    brokerStore.selectBroker(provider)
  }
})

function goBack() {
  router.push({ name: ROUTE_NAMES.BROKER_CONNECT })
}
</script>

<template>
  <section class="verification-page">
    <div class="verification-shell">
      <MobileStatusBar />
      <OnboardingHeader title="계좌 연결" :step="2" @back="goBack" />

      <main class="verification-content">
        <span class="verification-content__icon">
          <AppIcon name="shield-check" :size="30" />
        </span>
        <p class="verification-content__eyebrow">VERIFY YOUR IDENTITY</p>
        <h2>본인 인증을<br />진행할 차례예요</h2>
        <p v-if="selectedBroker">
          {{ selectedBroker.providerName }} 계좌 연결을 위해 본인 인증을 준비합니다.
        </p>
        <p v-else>선택한 증권사 정보를 확인할 수 없습니다.</p>

        <BaseButton variant="secondary" full-width @click="goBack">
          증권사 다시 선택하기
        </BaseButton>
      </main>
    </div>
  </section>
</template>

<style scoped>
.verification-page {
  display: grid;
  min-height: 100svh;
  place-items: center;
  background: var(--color-border-subtle);
}

.verification-shell {
  width: min(100%, 390px);
  min-height: min(844px, 100svh);
  background: var(--color-background);
}

.verification-content {
  display: grid;
  justify-items: start;
  gap: 14px;
  padding: 72px 28px 28px;
}

.verification-content__icon {
  display: grid;
  width: 64px;
  height: 64px;
  place-items: center;
  border-radius: 50%;
  background: var(--color-primary-subtle);
  color: var(--color-primary-strong);
}

.verification-content__eyebrow,
.verification-content h2,
.verification-content p {
  margin: 0;
}

.verification-content__eyebrow {
  color: var(--color-primary-strong);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.2px;
}

.verification-content h2 {
  font-size: 28px;
  line-height: 36px;
}

.verification-content > p:not(.verification-content__eyebrow) {
  margin-bottom: 20px;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 22px;
}

@media (min-width: 600px) {
  .verification-shell {
    border: 1px solid var(--color-border);
    border-radius: 24px;
    box-shadow: 0 24px 70px rgb(24 24 23 / 9%);
  }
}
</style>
