<script setup>
import { computed, onMounted, ref } from 'vue'
import { ChevronRight, TriangleAlert } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import BrokerLoginForm from '@/features/mypage/components/BrokerLoginForm.vue'
import OnboardingHeader from '@/features/mypage/components/OnboardingHeader.vue'
import { useBrokerConnectionStore } from '@/features/mypage/stores/brokerConnectionStore'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'

const brokerMarks = Object.freeze({
  KIWOOM: 'KW',
  MIRAE_ASSET: 'MA',
  KIS: 'KI',
  NH_SEC: 'NH',
  SAMSUNG_SEC: 'SS',
  KB_SEC: 'KB',
  SHINHAN_SEC: 'SH',
  HANA_SEC: 'HN',
  TOSS_SEC: 'TS',
  KAKAOPAY_SEC: 'KP',
  DAISHIN_SEC: 'DS',
  YUANTA_SEC: 'YA',
})

const route = useRoute()
const router = useRouter()
const brokerStore = useBrokerConnectionStore()
const pageError = ref('')
const loadingBroker = ref(false)
const routeBrokerId = computed(() => Number(route.query.brokerId))
const brokerMark = computed(() => {
  const code = brokerStore.selectedBroker?.brokerCode ?? ''
  return brokerMarks[code] ?? code.slice(0, 2).toUpperCase()
})

onMounted(loadSelectedBroker)

async function loadSelectedBroker() {
  loadingBroker.value = true
  pageError.value = ''
  brokerStore.resetConnectionRequest()

  try {
    if (!brokerStore.providers.length) {
      await brokerStore.fetchProviders()
    }

    const selectedBroker = Number.isFinite(routeBrokerId.value)
      ? brokerStore.providers.find((provider) => provider.brokerId === routeBrokerId.value)
      : brokerStore.selectedBroker

    if (!selectedBroker) {
      throw new Error('선택한 증권사 정보를 확인할 수 없습니다.')
    }

    brokerStore.selectBroker(selectedBroker)
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : '증권사 정보를 불러오지 못했습니다.'
  } finally {
    loadingBroker.value = false
  }
}

function goBack() {
  brokerStore.resetConnectionRequest()
  router.push({ name: ROUTE_NAMES.BROKER_CONNECT })
}

async function handleLogin(credentials) {
  try {
    await brokerStore.connectBroker(credentials)
    await goToHoldings()
  } catch {
    // 요청 상태와 오류 문구는 Store에서 관리합니다.
  }
}

function goToHoldings() {
  return router.push({
    name: ROUTE_NAMES.BROKER_HOLDINGS,
    query: { brokerId: brokerStore.selectedBroker?.brokerId },
  })
}
</script>

<template>
  <section class="onboarding-page">
    <div class="onboarding-shell">
      <OnboardingHeader title="계좌 연결" :step="2" @back="goBack" />

      <main class="broker-login-content">
        <BaseLoading v-if="loadingBroker" />

        <div v-else-if="pageError" class="broker-login-state" role="alert">
          <span><TriangleAlert :size="24" /></span>
          <h2>증권사를 다시 선택해 주세요</h2>
          <p>{{ pageError }}</p>
          <BaseButton variant="secondary" full-width @click="goBack">
            증권사 선택으로 돌아가기
          </BaseButton>
        </div>

        <template v-else-if="brokerStore.selectedBroker">
          <header class="broker-login-intro">
            <p class="broker-login-intro__eyebrow">BROKER SIGN IN</p>
            <h2>증권사 로그인</h2>
            <p>증권사에서 사용하는 아이디와 비밀번호를 입력해 주세요.</p>
          </header>

          <button
            class="selected-broker"
            type="button"
            aria-label="선택한 증권사 변경"
            @click="goBack"
          >
            <span class="selected-broker__mark" aria-hidden="true">
              {{ brokerMark }}
            </span>
            <span class="selected-broker__copy">
              <small>선택한 증권사</small>
              <strong>{{ brokerStore.selectedBroker.brokerName }}</strong>
            </span>
            <span class="selected-broker__change">
              변경
              <ChevronRight :size="17" />
            </span>
          </button>

          <BrokerLoginForm
            :status="brokerStore.connectionStatus"
            :error-message="brokerStore.connectionError"
            @submit="handleLogin"
            @continue="goToHoldings"
          />
        </template>
      </main>
    </div>
  </section>
</template>

<style scoped>
.onboarding-page {
  display: grid;
  min-height: 100svh;
  place-items: center;
  background: var(--color-border-subtle);
}

.onboarding-shell {
  width: min(100%, 390px);
  min-height: min(874px, 100svh);
  overflow: hidden;
  background: #ffffff;
}

.broker-login-content {
  display: grid;
  gap: 16px;
  padding: 20px 20px 18px;
}

.broker-login-intro {
  display: grid;
  gap: 6px;
}

.broker-login-intro p,
.broker-login-intro h2,
.broker-login-state h2,
.broker-login-state p {
  margin: 0;
}

.broker-login-intro__eyebrow {
  color: var(--brand-teal-deep);
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 600;
  letter-spacing: 1.2px;
}

.broker-login-intro h2 {
  font-family: var(--font-heading);
  font-size: var(--font-size-title-lg);
  letter-spacing: -0.4px;
  line-height: 1.4;
}

.broker-login-intro > p:last-child {
  color: var(--color-text-muted);
  font-size: var(--font-size-caption);
  line-height: 1.4;
}

.selected-broker {
  display: grid;
  width: 100%;
  min-height: 66px;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  border: 1px solid var(--slate-strong);
  border-radius: 11px;
  background: var(--slate-strong);
  color: #ffffff;
  cursor: pointer;
  text-align: left;
}

.selected-broker__mark {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 10px;
  background: var(--brand-teal);
  color: var(--slate-strong);
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.selected-broker__copy {
  display: grid;
  gap: 2px;
}

.selected-broker__copy small {
  color: #dce6e9;
  font-size: var(--font-size-caption);
}

.selected-broker__copy strong {
  font-size: var(--font-size-body);
}

.selected-broker__change {
  display: flex;
  align-items: center;
  gap: 1px;
  color: #8fa7b0;
  font-size: var(--font-size-caption);
}

.broker-login-state {
  display: grid;
  min-height: 520px;
  align-content: center;
  justify-items: center;
  gap: 12px;
  text-align: center;
}

.broker-login-state > span {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border-radius: 50%;
  background: var(--brand-red-soft);
  color: var(--brand-red);
}

.broker-login-state h2 {
  font-size: var(--font-size-title-md);
}

.broker-login-state p {
  margin-bottom: 8px;
  color: var(--color-text-muted);
  font-size: var(--font-size-body);
}

@media (min-width: 600px) {
  .onboarding-shell {
    border: 1px solid var(--color-border);
    border-radius: 24px;
    box-shadow: 0 24px 70px rgb(24 24 23 / 9%);
  }
}
</style>
