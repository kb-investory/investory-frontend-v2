<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import BrokerCard from '@/modules/auth/components/BrokerCard.vue'
import OnboardingHeader from '@/modules/auth/components/OnboardingHeader.vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseLoading from '@/shared/components/BaseLoading.vue'
import MobileStatusBar from '@/shared/components/MobileStatusBar.vue'
import SearchInput from '@/shared/components/SearchInput.vue'
import { useBrokerStore } from '@/shared/stores/brokerStore'

const router = useRouter()
const brokerStore = useBrokerStore()
const searchQuery = ref('')

async function loadBrokers(query = '') {
  try {
    await brokerStore.fetchBrokers(query)
  } catch {
    // 오류 상태는 Store에서 관리하고 화면에서 안내합니다.
  }
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }

  router.push({ name: ROUTE_NAMES.LOGIN })
}

function goToVerification() {
  if (!brokerStore.selectedProvider) {
    return
  }

  router.push({
    name: ROUTE_NAMES.BROKER_VERIFY,
    query: { providerId: brokerStore.selectedProvider.providerId },
  })
}

watch(searchQuery, (query) => loadBrokers(query), { immediate: true })
</script>

<template>
  <section class="broker-page">
    <div class="broker-shell">
      <MobileStatusBar />
      <OnboardingHeader title="계좌 연결" :step="1" @back="goBack" />

      <main class="broker-content">
        <header class="broker-intro">
          <p class="broker-intro__eyebrow">CHOOSE YOUR BROKER</p>
          <h2>어느 증권사를<br />연결할까요?</h2>
          <p>보유 계좌를 안전하게 불러올 증권사를 선택해 주세요.</p>
        </header>

        <SearchInput
          v-model="searchQuery"
          variant="outlined"
          placeholder="증권사 이름을 검색하세요"
        />

        <section class="broker-list" aria-labelledby="broker-list-title">
          <header class="broker-list__header">
            <h3 id="broker-list-title">주요 증권사</h3>
            <span>주요 {{ brokerStore.providers.length }}개</span>
          </header>

          <BaseLoading v-if="brokerStore.loading" />

          <div v-else-if="brokerStore.error" class="broker-state" role="alert">
            <AppIcon name="triangle-alert" :size="22" />
            <p>증권사 목록을 불러오지 못했습니다.</p>
            <button type="button" @click="loadBrokers(searchQuery)">다시 시도</button>
          </div>

          <div v-else-if="brokerStore.providers.length" class="broker-grid">
            <BrokerCard
              v-for="broker in brokerStore.providers"
              :key="broker.providerId"
              :broker="broker"
              :selected="brokerStore.selectedProvider?.providerId === broker.providerId"
              @select="brokerStore.selectBroker"
            />
          </div>

          <div v-else class="broker-state" role="status">
            <AppIcon name="search" :size="22" />
            <p>“{{ searchQuery }}”에 해당하는 증권사가 없어요.</p>
            <button type="button" @click="searchQuery = ''">전체 목록 보기</button>
          </div>
        </section>

        <aside class="security-card">
          <span class="security-card__icon">
            <AppIcon name="lock-keyhole" :size="15" />
          </span>
          <span>
            <strong>읽기 전용으로 안전하게</strong>
            <small>Investory는 거래 권한과 비밀번호를 저장하지 않아요.</small>
          </span>
        </aside>

        <div class="broker-action">
          <BaseButton
            full-width
            :disabled="!brokerStore.selectedProvider"
            @click="goToVerification"
          >
            {{
              brokerStore.selectedProvider
                ? `${brokerStore.selectedProvider.providerName} 연결하기`
                : '증권사를 선택해 주세요'
            }}
            <template #icon><AppIcon name="arrow-right" :size="18" /></template>
          </BaseButton>
          <p>다음 단계에서 본인 인증을 진행해요</p>
        </div>
      </main>
    </div>
  </section>
</template>

<style scoped>
.broker-page {
  display: grid;
  min-height: 100svh;
  place-items: center;
  background: var(--color-border-subtle);
}

.broker-shell {
  width: min(100%, 390px);
  min-height: min(844px, 100svh);
  overflow: hidden;
  background: var(--color-background);
}

.broker-content {
  display: grid;
  gap: 16px;
  padding: 20px 20px 18px;
}

.broker-intro {
  display: grid;
  gap: 7px;
}

.broker-intro p,
.broker-intro h2,
.broker-list__header h3,
.broker-state p,
.broker-action p {
  margin: 0;
}

.broker-intro__eyebrow {
  color: var(--color-primary-strong);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.2px;
}

.broker-intro h2 {
  font-size: 27px;
  letter-spacing: -0.4px;
  line-height: 33px;
}

.broker-intro > p:last-child {
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 19px;
}

.broker-list {
  display: grid;
  gap: 8px;
}

.broker-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.broker-list__header h3 {
  font-size: 14px;
}

.broker-list__header span {
  color: var(--color-text-subtle);
  font-size: 11px;
}

.broker-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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
  font-size: 13px;
  line-height: 20px;
}

.broker-state button {
  padding: 6px 10px;
  border: 0;
  border-radius: 6px;
  background: var(--color-primary-subtle);
  color: var(--color-primary-strong);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.security-card {
  display: flex;
  min-height: 52px;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-surface);
}

.security-card__icon {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: var(--color-primary-subtle);
  color: var(--color-primary-strong);
}

.security-card > span:last-child {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.security-card strong {
  font-size: 12px;
}

.security-card small {
  color: var(--color-text-muted);
  font-size: 10.5px;
  line-height: 14px;
}

.broker-action {
  display: grid;
  gap: 8px;
}

.broker-action p {
  color: var(--color-text-subtle);
  font-size: 10.5px;
  text-align: center;
}

@media (min-width: 600px) {
  .broker-shell {
    border: 1px solid var(--color-border);
    border-radius: 24px;
    box-shadow: 0 24px 70px rgb(24 24 23 / 9%);
  }
}

@media (max-width: 350px) {
  .broker-content {
    padding-inline: 16px;
  }

  .broker-grid {
    gap: 6px;
  }
}
</style>
