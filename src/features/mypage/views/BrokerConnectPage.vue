<script setup>
import { ref, watch } from 'vue'
import { Search, TriangleAlert } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import BrokerCard from '@/features/mypage/components/BrokerCard.vue'
import OnboardingHeader from '@/features/mypage/components/OnboardingHeader.vue'
import { useBrokerConnectionStore } from '@/features/mypage/stores/brokerConnectionStore'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'

const route = useRoute()
const router = useRouter()
const brokerStore = useBrokerConnectionStore()
const searchQuery = ref('')

async function loadBrokers(query = '') {
  try {
    await brokerStore.fetchProviders(query)
  } catch {
    // 요청 오류는 Store에서 관리하고 화면에서 안내합니다.
  }
}

function goBack() {
  if (route.query.from === 'mypage-accounts') {
    router.push({ name: ROUTE_NAMES.MYPAGE_ACCOUNTS })
    return
  }

  router.push({ name: ROUTE_NAMES.WELCOME })
}

function goToLogin() {
  if (!brokerStore.selectedBroker) {
    return
  }

  router.push({
    name: ROUTE_NAMES.BROKER_LOGIN,
    query: {
      brokerId: brokerStore.selectedBroker.brokerId,
      ...(route.query.from ? { from: route.query.from } : {}),
    },
  })
}

watch(
  searchQuery,
  (query, _, onCleanup) => {
    if (!query.trim()) {
      void loadBrokers()
      return
    }

    const timer = window.setTimeout(() => loadBrokers(query), 300)
    onCleanup(() => window.clearTimeout(timer))
  },
  { immediate: true },
)
</script>

<template>
  <section class="onboarding-page">
    <div class="onboarding-shell">
      <OnboardingHeader title="계좌 연결" :step="1" @back="goBack" />

      <main class="broker-content">
        <label class="search-input">
          <Search :size="18" />
          <input v-model="searchQuery" type="search" placeholder="증권사 이름을 검색하세요" />
        </label>

        <section class="broker-list" aria-labelledby="broker-list-title">
          <header class="broker-list__header">
            <h3 id="broker-list-title">주요 증권사</h3>
            <span>주요 {{ brokerStore.providers.length }}개</span>
          </header>

          <BaseLoading v-if="brokerStore.loading" />

          <div v-else-if="brokerStore.error" class="broker-state" role="alert">
            <TriangleAlert :size="22" />
            <p>증권사 목록을 불러오지 못했습니다.</p>
            <button type="button" @click="loadBrokers(searchQuery)">다시 시도</button>
          </div>

          <div v-else-if="brokerStore.providers.length" class="broker-grid">
            <BrokerCard
              v-for="broker in brokerStore.providers"
              :key="broker.brokerId"
              :broker="broker"
              :selected="brokerStore.selectedBroker?.brokerId === broker.brokerId"
              @select="brokerStore.selectBroker"
            />
          </div>

          <div v-else class="broker-state" role="status">
            <Search :size="22" />
            <p>“{{ searchQuery }}”에 해당하는 증권사가 없어요.</p>
            <button type="button" @click="searchQuery = ''">전체 목록 보기</button>
          </div>
        </section>

        <div class="broker-action">
          <BaseButton full-width :disabled="!brokerStore.selectedBroker" @click="goToLogin">
            {{ brokerStore.selectedBroker ? '선택한 증권사 연결' : '증권사를 선택해 주세요' }}
          </BaseButton>
        </div>
      </main>
    </div>
  </section>
</template>

<style scoped>
.onboarding-page {
  display: grid;
  width: 100%;
  height: 100dvh;
  min-height: 0;
  place-items: center;
  overflow: hidden;
  overscroll-behavior: none;
  background: var(--color-border-subtle);
}

.onboarding-shell {
  width: 100%;
  height: 100%;
  max-height: 844px;
  overflow: hidden;
  background: #ffffff;
}

.broker-content {
  display: flex;
  height: calc(100% - 172px);
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 18px 20px 14px;
}

.broker-list__header h3,
.broker-state p,
.broker-action p {
  margin: 0;
}

.search-input {
  display: grid;
  height: 46px;
  grid-template-columns: 24px 1fr;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  color: var(--color-text-subtle);
}

.search-input:focus-within {
  border-color: var(--brand-teal);
  box-shadow: 0 0 0 3px var(--brand-teal-soft);
}

.search-input input {
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--color-text);
  font-size: var(--font-size-body);
}

.broker-list {
  display: grid;
  gap: 8px;
  flex: 1;
}

.broker-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.broker-list__header h3 {
  font-size: var(--font-size-body);
}

.broker-list__header span {
  color: var(--color-text-subtle);
  font-size: var(--font-size-caption);
}

.broker-grid {
  display: grid;
  gap: 8px;
}

.broker-state {
  display: grid;
  min-height: 280px;
  place-items: center;
  align-content: center;
  gap: 10px;
  padding: 24px;
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  color: var(--color-text-muted);
  text-align: center;
}

.broker-state p {
  font-size: var(--font-size-body);
  line-height: 1.4;
}

.broker-state button {
  padding: 6px 10px;
  border: 0;
  border-radius: 6px;
  background: var(--brand-mist);
  color: var(--brand-teal-deep);
  cursor: pointer;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.broker-action {
  position: sticky;
  bottom: -14px;
  z-index: 4;
  margin: auto -20px -14px;
  padding: 14px 20px;
  border-top: 1px solid var(--color-border-subtle);
  background: #ffffff;
}

.broker-action :deep(.base-button--primary) {
  border-radius: 8px;
  background: #263a43;
}

@media (min-width: 600px) {
  .onboarding-shell {
    border: 1px solid var(--color-border);
    border-radius: 24px;
    box-shadow: 0 24px 70px rgb(24 24 23 / 9%);
  }
}
</style>
