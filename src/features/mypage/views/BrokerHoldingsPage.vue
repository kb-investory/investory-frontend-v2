<script setup>
import { computed, onMounted, ref } from 'vue'
import { TriangleAlert } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import ConnectedAccountSummary from '@/features/mypage/components/ConnectedAccountSummary.vue'
import OnboardingHeader from '@/features/mypage/components/OnboardingHeader.vue'
import OnboardingHoldingCard from '@/features/mypage/components/OnboardingHoldingCard.vue'
import { useBrokerConnectionStore } from '@/features/mypage/stores/brokerConnectionStore'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'

const route = useRoute()
const router = useRouter()
const brokerStore = useBrokerConnectionStore()
const pageError = ref('')
const routeBrokerId = computed(() => Number(route.query.brokerId))

onMounted(loadHoldings)

async function loadHoldings() {
  pageError.value = ''

  try {
    if (!brokerStore.hasVerifiedConnection) {
      throw new Error('증권사 로그인을 완료한 후 보유 종목을 확인해 주세요.')
    }

    if (
      Number.isFinite(routeBrokerId.value) &&
      routeBrokerId.value !== brokerStore.selectedBroker?.brokerId
    ) {
      throw new Error('로그인한 증권사와 요청한 증권사가 일치하지 않습니다.')
    }

    await brokerStore.fetchHoldings()
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : '보유 종목을 불러오지 못했습니다.'
  }
}

function goBack() {
  router.push({
    name: ROUTE_NAMES.BROKER_LOGIN,
    query: { brokerId: brokerStore.selectedBroker?.brokerId },
  })
}

function goNext() {
  router.push({
    name: ROUTE_NAMES.BROKER_COMPLETE,
    query: { brokerId: brokerStore.selectedBroker?.brokerId },
  })
}
</script>

<template>
  <section class="onboarding-page">
    <div class="onboarding-shell">
      <OnboardingHeader title="보유 종목 확인" :step="3" @back="goBack" />

      <main class="holdings-content">
        <BaseLoading v-if="brokerStore.holdingsLoading" />

        <div v-else-if="pageError" class="holdings-state" role="alert">
          <TriangleAlert :size="24" />
          <strong>보유 종목을 불러오지 못했습니다.</strong>
          <p>{{ pageError }}</p>
          <BaseButton variant="secondary" full-width @click="loadHoldings"> 다시 시도 </BaseButton>
        </div>

        <template v-else-if="brokerStore.account">
          <ConnectedAccountSummary
            :broker-name="brokerStore.account.brokerName"
            :account-count="brokerStore.account.accountCount"
            :holdings-count="brokerStore.holdings.length"
            :total-valuation="brokerStore.totalValuation"
          />

          <header class="holdings-intro">
            <h2>보유 종목 ({{ brokerStore.holdings.length }})</h2>
            <span>평가금액</span>
          </header>

          <section class="holdings-list" aria-label="연결된 보유 종목 목록">
            <OnboardingHoldingCard
              v-for="holding in brokerStore.holdings"
              :key="holding.securityId"
              :holding="holding"
            />
            <p v-if="!brokerStore.holdings.length" class="holdings-empty">
              연결된 보유 종목이 없습니다.
            </p>
          </section>

          <footer class="holdings-action">
            <BaseButton full-width :disabled="!brokerStore.holdings.length" @click="goNext">
              이대로 연결하기
            </BaseButton>
          </footer>
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
  height: min(844px, 100svh);
  overflow: hidden;
  background: #ffffff;
}

.holdings-content {
  display: flex;
  height: calc(100% - 172px);
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding: 10px 20px 14px;
}

.holdings-intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.holdings-intro h2,
.holdings-state p,
.holdings-empty {
  margin: 0;
}

.holdings-intro h2 {
  color: var(--color-heading);
  font-family: var(--font-heading);
  font-size: var(--font-size-body);
  letter-spacing: -0.2px;
}

.holdings-intro span {
  color: var(--color-text-muted);
  font-size: var(--font-size-caption);
  font-weight: 500;
  line-height: 1.4;
}

.holdings-list {
  display: grid;
  gap: 0;
  flex: 1;
}

.holdings-action {
  position: sticky;
  bottom: -14px;
  z-index: 4;
  margin: auto -20px -14px;
  padding: 14px 20px;
  border-top: 1px solid var(--color-border-subtle);
  background: #ffffff;
}

.holdings-action :deep(.base-button--primary) {
  min-height: 46px;
  border-radius: 8px;
  background: #263a43;
}

.holdings-state {
  display: grid;
  min-height: 520px;
  align-content: center;
  justify-items: center;
  gap: 10px;
  color: var(--brand-red);
  text-align: center;
}

.holdings-state p,
.holdings-empty {
  color: var(--color-text-muted);
  font-size: var(--font-size-caption);
}

.holdings-empty {
  padding: 32px 0;
  text-align: center;
}

@media (min-width: 600px) {
  .onboarding-shell {
    border: 1px solid var(--color-border);
    border-radius: 24px;
    box-shadow: 0 24px 70px rgb(24 24 23 / 9%);
  }
}
</style>
