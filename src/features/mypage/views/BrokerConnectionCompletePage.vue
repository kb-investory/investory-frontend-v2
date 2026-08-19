<script setup>
import { computed, ref } from 'vue'
import { Check } from '@lucide/vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import { useBrokerConnectionStore } from '@/features/mypage/stores/brokerConnectionStore'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'

const router = useRouter()
const brokerStore = useBrokerConnectionStore()
const completing = ref(false)
const completionError = ref('')
const reasonCount = computed(
  () =>
    brokerStore.account?.reasonCount ??
    brokerStore.holdings.filter((holding) => Boolean(holding.rationaleText?.trim())).length,
)

async function goHome() {
  if (completing.value) return

  completing.value = true
  completionError.value = ''
  try {
    await brokerStore.completeConnection()
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
      <img class="complete-logo" src="/assets/logos/investory-logo-dark.png" alt="Investory" />

      <main class="complete-content">
        <div class="complete-body">
          <span class="complete-check">
            <Check :size="34" />
          </span>

          <div class="complete-copy">
            <h1>계좌 연결이<br />완료됐어요</h1>
            <p>이제 투자 일지를 작성해보세요.</p>
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
              <dd class="complete-summary__number">{{ reasonCount }}개</dd>
            </div>
          </dl>
        </div>

        <footer class="complete-action">
          <BaseButton full-width :disabled="completing" @click="goHome">
            {{ completing ? '연결 마무리 중...' : '홈으로 이동' }}
          </BaseButton>
          <p v-if="completionError" class="complete-action__error" role="alert">
            {{ completionError }}
          </p>
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
  position: relative;
  width: min(100%, 390px);
  height: min(844px, 100svh);
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 30%, rgb(15 143 140 / 24%), transparent 32%),
    linear-gradient(145deg, #031a23 0%, #062b34 100%);
  color: #ffffff;
}

.complete-logo {
  position: absolute;
  top: 10px;
  left: 20px;
  display: block;
  width: 146px;
  height: 44px;
  object-fit: contain;
  object-position: left center;
}

.complete-content {
  display: flex;
  height: 100%;
  flex-direction: column;
  justify-content: space-between;
  padding: 118px 20px 22px;
}

.complete-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.complete-check {
  display: grid;
  width: 76px;
  height: 76px;
  place-items: center;
  border-radius: 50%;
  border: 1px solid rgb(92 235 228 / 48%);
  outline: 16px solid rgb(35 216 209 / 8%);
  background: linear-gradient(145deg, #20c8c1, #087f7c);
  box-shadow: 0 0 36px rgb(35 216 209 / 23%);
  color: #ffffff;
}

.complete-copy {
  display: grid;
  width: 100%;
  gap: 8px;
  text-align: center;
}

.complete-copy h1,
.complete-copy p,
.complete-action p {
  margin: 0;
}

.complete-action .complete-action__error {
  color: #d64545;
  font-weight: 700;
}

.complete-copy h1 {
  color: #ffffff;
  font-family: var(--font-heading);
  font-size: var(--font-size-title-lg);
  letter-spacing: -0.7px;
  line-height: 1.35;
}

.complete-copy p {
  color: #bfd0d5;
  font-size: var(--font-size-body);
  font-weight: 500;
  line-height: 1.4;
}

.complete-summary {
  width: 100%;
  margin: 0;
  padding: 8px 16px;
  border: 1px solid rgb(255 255 255 / 13%);
  border-radius: 12px;
  background: rgb(38 58 67 / 78%);
}

.complete-summary > div {
  display: flex;
  min-height: 56px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgb(255 255 255 / 14%);
}

.complete-summary > div:last-child {
  border-bottom: 0;
}

.complete-summary dt {
  color: #dce6e9;
  font-size: var(--font-size-body);
  font-weight: 500;
}

.complete-summary dd {
  margin: 0;
  color: #ffffff;
  font-size: var(--font-size-body);
  font-weight: 700;
}

.complete-summary__number {
  font-family: var(--font-mono);
}

.complete-action {
  display: grid;
  gap: 9px;
  padding: 14px;
  border-radius: 14px;
  background: #ffffff;
}

.complete-action :deep(.base-button--primary) {
  min-height: 50px;
  border-radius: 8px;
  background: #263a43;
}

.complete-action p {
  color: var(--color-text-muted);
  font-size: var(--font-size-caption);
  line-height: 1.4;
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
