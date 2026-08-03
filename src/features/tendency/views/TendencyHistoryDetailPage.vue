<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useTendencyStore } from '@/features/tendency/stores/tendencyStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'

const route = useRoute()
const router = useRouter()
const tendencyStore = useTendencyStore()

const historyItem = computed(() => tendencyStore.getHistoryById(route.params.analysisRunId))

const isCurrentAnalysis = computed(
  () => String(tendencyStore.analysis?.analysisRunId) === String(route.params.analysisRunId),
)
const isFirstAnalysis = computed(() => historyItem.value?.changedCount === 0)

function formatDate(date) {
  return date?.replaceAll('-', '. ') || ''
}

onMounted(() => tendencyStore.fetchTendencies())
</script>

<template>
  <div class="history-detail-page">
    <header class="detail-app-bar">
      <button type="button" aria-label="이전 화면으로 돌아가기" @click="router.back()">
        <AppIcon name="chevron-left" :size="21" />
      </button>
      <strong>성향 변화 상세</strong>
      <span />
    </header>

    <div v-if="tendencyStore.loading" class="loading-wrapper">
      <BaseLoading />
    </div>

    <main v-else-if="historyItem" class="detail-content">
      <section class="detail-hero">
        <span>{{
          isCurrentAnalysis && !isFirstAnalysis
            ? '현재 투자성향'
            : historyItem.label
        }}</span>
        <h1>{{ formatDate(historyItem.analyzedDate) }} 분석</h1>
        <p v-if="isCurrentAnalysis && tendencyStore.analysis?.period">
          {{ formatDate(tendencyStore.analysis.period.startDate) }} ~
          {{ formatDate(tendencyStore.analysis.period.endDate) }} · 최근
          {{ tendencyStore.analysis.period.days }}일
        </p>
        <div class="detail-hero__count">
          <strong>{{ historyItem.changedCount }}</strong>
          <span>개의 투자성향이<br />이전 분석에서 달라졌어요</span>
        </div>
      </section>

      <section v-if="historyItem.changes.length" class="change-section">
        <header>
          <span>변경 내역</span>
          <h2>무엇이 달라졌나요?</h2>
        </header>

        <article v-for="change in historyItem.changes" :key="change.dimension" class="change-card">
          <div class="change-card__header">
            <span>{{ change.dimension }}</span>
            <AppIcon name="trending-up" :size="17" />
          </div>
          <div class="change-card__types">
            <span>{{ change.previousType }}</span>
            <AppIcon name="arrow-right" :size="15" />
            <strong>{{ change.currentType }}</strong>
          </div>
          <p>{{ change.reason }}</p>
        </article>
      </section>

      <section v-else class="empty-change">
        <AppIcon name="check" :size="22" />
        <strong>첫 투자성향 분석이에요</strong>
        <p>이 분석을 기준으로 다음 변화부터 비교해 드릴게요.</p>
      </section>

      <section v-if="isCurrentAnalysis && !isFirstAnalysis" class="current-overview">
        <header>
          <span>현재 결과</span>
          <h2>{{ tendencyStore.analysis.analysisResults.length }}가지 투자성향</h2>
        </header>
        <div>
          <article
            v-for="result in tendencyStore.analysis.analysisResults"
            :key="result.dimension.code"
          >
            <span>{{ result.dimension.name }}</span>
            <strong>{{ result.type.name }}</strong>
          </article>
        </div>
      </section>
    </main>

    <section v-else class="not-found-state">
      <strong>분석 이력을 찾지 못했어요</strong>
      <button type="button" @click="router.back()">이전 화면으로 돌아가기</button>
    </section>
  </div>
</template>

<style scoped>
.history-detail-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 17px;
  background: #ffffff;
  box-shadow: 0 0 0 20px #ffffff;
}

.detail-app-bar {
  display: grid;
  grid-template-columns: 36px 1fr 36px;
  align-items: center;
  min-height: 40px;
}

.detail-app-bar button {
  display: inline-flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

.detail-app-bar strong {
  color: #263a43;
  font-size: 14px;
  text-align: center;
}

.detail-content {
  display: grid;
  gap: 15px;
}

.detail-hero {
  position: relative;
  display: grid;
  gap: 5px;
  padding: 18px;
  overflow: hidden;
  border-radius: 18px;
  background: #153e42;
  color: #ffffff;
}

.detail-hero::after {
  position: absolute;
  top: -34px;
  right: -28px;
  width: 124px;
  height: 124px;
  border-radius: 50%;
  background: rgba(73, 214, 204, 0.13);
  content: '';
}

.detail-hero > span {
  color: #76dcd7;
  font-size: 10px;
  font-weight: 700;
}

.detail-hero h1,
.detail-hero p,
.change-section h2,
.change-card p,
.current-overview h2 {
  margin: 0;
}

.detail-hero h1 {
  font-family: var(--font-heading);
  font-size: 23px;
  letter-spacing: -0.04em;
}

.detail-hero p {
  color: #a8c7c8;
  font-family: var(--font-mono);
  font-size: 9px;
}

.detail-hero__count {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 13px;
  padding-top: 13px;
  border-top: 1px solid rgba(255, 255, 255, 0.14);
}

.detail-hero__count strong {
  color: #58d8d1;
  font-size: 34px;
  line-height: 1;
}

.detail-hero__count span {
  color: #d4e5e6;
  font-size: 10px;
  line-height: 1.45;
}

.change-section,
.current-overview {
  display: grid;
  gap: 10px;
}

.change-section header > span,
.current-overview header > span {
  color: #0b8f8b;
  font-size: 9px;
  font-weight: 750;
}

.change-section h2,
.current-overview h2 {
  margin-top: 2px;
  color: #263a43;
  font-size: 16px;
}

.change-card {
  display: grid;
  gap: 12px;
  padding: 15px;
  border: 1px solid #dfe7e7;
  border-radius: 14px;
  background: #ffffff;
}

.change-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #0b8f8b;
}

.change-card__header span {
  color: #6f7b7d;
  font-size: 10px;
  font-weight: 700;
}

.change-card__types {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  color: #8a9496;
}

.change-card__types span,
.change-card__types strong {
  padding: 8px;
  border-radius: 8px;
  font-size: 11px;
  text-align: center;
}

.change-card__types span {
  background: #f3f5f5;
  color: #838d8f;
  text-decoration: line-through;
}

.change-card__types strong {
  background: #e8f7f6;
  color: #087f7c;
}

.change-card p {
  color: #717d7f;
  font-size: 10px;
  line-height: 1.55;
}

.current-overview > div {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.current-overview article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 10px;
  border: 1px solid #e0e7e7;
  border-radius: 10px;
  background: #ffffff;
}

.current-overview article span {
  color: #849092;
  font-size: 9px;
}

.current-overview article strong {
  color: #33474c;
  font-size: 10px;
}

.empty-change,
.not-found-state {
  display: flex;
  min-height: 180px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px;
  border: 1px solid #dfe7e7;
  border-radius: 15px;
  background: #ffffff;
  color: #0b8f8b;
  text-align: center;
}

.empty-change strong,
.not-found-state strong {
  color: #263a43;
  font-size: 13px;
}

.empty-change p {
  margin: 0;
  color: #7f8b8d;
  font-size: 10px;
}

.not-found-state button {
  border: 0;
  background: transparent;
  color: #087f7c;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
}

.loading-wrapper {
  display: flex;
  min-height: 400px;
  align-items: center;
  justify-content: center;
}
</style>
