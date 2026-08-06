<script setup>
import { ref } from 'vue'
import { ArrowRight, Check, House } from '@lucide/vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import { useBrokerConnectionStore } from '@/features/mypage/stores/brokerConnectionStore'
import { useMypageStore } from '@/features/mypage/stores/mypageStore'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'

const router = useRouter()
const brokerStore = useBrokerConnectionStore()
const mypageStore = useMypageStore()
const completing = ref(false)
const completionError = ref('')

async function goHome() {
  if (completing.value) return

  completing.value = true
  completionError.value = ''
  try {
    await brokerStore.completeConnection()
    await mypageStore.fetchAccounts()
    await router.push({ name: ROUTE_NAMES.HOME })
  } catch (error) {
    completionError.value =
      error instanceof Error ? error.message : '계좌 연결을 완료하지 못했어요.'
  } finally {
    completing.value = false
  }
}
</script>

<template>
  <section class="complete-page">
    <div class="complete-shell">
      <header class="complete-header">
        <h1>계좌 연결</h1>
        <span>완료</span>
      </header>

      <main class="complete-content">
        <div class="complete-body">
          <span class="complete-check">
            <Check :size="34" />
          </span>

          <div class="complete-copy">
            <h2>계좌 연결이 완료됐어요</h2>
            <p>
              연결한 계좌와 보유 종목을 확인할 수 있어요.<br />
              투자 기록과 자산 관리를 이어가보세요.
            </p>
          </div>

          <dl class="complete-summary">
            <div>
              <dt>연결 계좌</dt>
              <dd>
                {{ brokerStore.account?.brokerName || '연결 증권사' }} ·
                {{ brokerStore.account?.accountCount || 0 }}개
              </dd>
            </div>
            <div>
              <dt>보유 종목</dt>
              <dd class="complete-summary__number">{{ brokerStore.holdings.length }}개</dd>
            </div>
            <div>
              <dt>입력한 보유 근거</dt>
              <dd>{{ brokerStore.reasonCount }}개</dd>
            </div>
          </dl>

          <aside class="complete-guide">
            <span><House :size="17" /></span>
            <div>
              <strong>연결한 자산을 확인해보세요</strong>
              <p>홈에서 계좌와 보유 종목 정보를 한눈에 볼 수 있어요.</p>
            </div>
          </aside>
        </div>

        <footer class="complete-action">
          <BaseButton full-width :disabled="completing" @click="goHome">
            {{ completing ? '계좌 추가 중...' : '홈에서 자산 확인하기' }}
            <template #icon><ArrowRight :size="18" /></template>
          </BaseButton>
          <p v-if="completionError" class="complete-action__error" role="alert">
            {{ completionError }}
          </p>
          <p>연결된 계좌는 마이페이지에서 언제든 관리할 수 있어요.</p>
        </footer>
      </main>
    </div>
  </section>
</template>

<style scoped>
.complete-page {
  display: grid;
  min-height: 100svh;
  place-items: center;
  background: var(--color-border-subtle);
}

.complete-shell {
  width: min(100%, 390px);
  min-height: min(844px, 100svh);
  overflow: hidden;
  background: #ffffff;
}

.complete-header {
  display: flex;
  width: 100%;
  height: 54px;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--color-border-subtle);
  background: #ffffff;
}

.complete-header h1 {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 700;
}

.complete-header span {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border-radius: var(--radius-pill);
  background: var(--slate-strong);
  color: #ffffff;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
}

.complete-content {
  display: flex;
  min-height: 728px;
  flex-direction: column;
  justify-content: space-between;
  padding: 30px 20px 20px;
}

.complete-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
}

.complete-check {
  display: grid;
  width: 68px;
  height: 68px;
  place-items: center;
  border-radius: 50%;
  outline: 4px solid #bfe4e2;
  background: var(--brand-teal-soft);
  box-shadow: 0 5px 14px rgb(0 0 0 / 7%);
  color: var(--slate-strong);
}

.complete-copy {
  display: grid;
  width: 100%;
  gap: 8px;
  text-align: center;
}

.complete-copy h2,
.complete-copy p,
.complete-guide p,
.complete-action p {
  margin: 0;
}

.complete-action .complete-action__error {
  color: #d64545;
  font-weight: 700;
}

.complete-copy h2 {
  font-family: var(--font-heading);
  font-size: 23px;
  letter-spacing: -0.5px;
}

.complete-copy p {
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 500;
  line-height: 19px;
}

.complete-summary {
  width: 100%;
  margin: 0;
  padding: 8px 14px;
  border-radius: 8px;
  background: var(--slate-strong);
}

.complete-summary > div {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgb(255 255 255 / 14%);
}

.complete-summary > div:last-child {
  border-bottom: 0;
}

.complete-summary dt {
  color: #dce6e9;
  font-size: 12px;
  font-weight: 500;
}

.complete-summary dd {
  margin: 0;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
}

.complete-summary__number {
  font-family: var(--font-mono);
}

.complete-guide {
  display: grid;
  width: 100%;
  grid-template-columns: 34px 1fr;
  align-items: center;
  gap: 10px;
  padding: 0 4px;
}

.complete-guide > span {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 8px;
  background: var(--brand-teal-soft);
  color: var(--brand-teal-deep);
}

.complete-guide > div {
  display: grid;
  gap: 3px;
}

.complete-guide strong {
  font-size: 12px;
}

.complete-guide p {
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 17px;
}

.complete-action {
  display: grid;
  gap: 9px;
}

.complete-action :deep(.base-button--primary) {
  min-height: 50px;
  border-radius: 8px;
  background: var(--slate-strong);
}

.complete-action :deep(svg) {
  color: var(--amber-500);
}

.complete-action p {
  color: var(--color-text-subtle);
  font-size: 11px;
  line-height: 16px;
  text-align: center;
}

@media (min-width: 600px) {
  .complete-shell {
    border: 1px solid var(--color-border);
    border-radius: 24px;
    box-shadow: 0 24px 70px rgb(24 24 23 / 9%);
  }
}
</style>
