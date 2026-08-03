<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import { useTendencyStore } from '@/features/tendency/stores/tendencyStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'

const router = useRouter()
const tendencyStore = useTendencyStore()
const selectedIds = ref([])
const initialSelectedIds = ref([])
const tendencySummaryOpen = ref(true)
const applying = ref(false)
const applyError = ref('')
const selectionInitialized = ref(false)

const recommendations = computed(() =>
  tendencyStore.isAnalysisLocked ? [] : tendencyStore.activeRecommendations,
)
const selectedCount = computed(() => selectedIds.value.length)
const allSelected = computed(
  () => recommendations.value.length > 0 && selectedCount.value === recommendations.value.length,
)
const hasUnsavedChanges = computed(
  () => [...selectedIds.value].sort().join(',') !== [...initialSelectedIds.value].sort().join(','),
)
const selectionButtonText = computed(() => {
  if (applying.value) return '적용하는 중...'
  if (!selectedCount.value) return '적용할 원칙을 선택해주세요'
  return `선택한 원칙 ${selectedCount.value}개 적용하기`
})

function isSelected(recommendationId) {
  return selectedIds.value.includes(recommendationId)
}

function toggleRecommendation(recommendationId) {
  if (isSelected(recommendationId)) {
    selectedIds.value = selectedIds.value.filter((id) => id !== recommendationId)
    return
  }

  selectedIds.value = [...selectedIds.value, recommendationId]
}

function toggleAll() {
  selectedIds.value = allSelected.value
    ? []
    : recommendations.value.map((recommendation) => recommendation.recommendationId)
}

async function applySelectedRecommendations() {
  if (!selectedCount.value || applying.value) return

  applying.value = true
  applyError.value = ''

  try {
    await tendencyStore.applyRecommendations(selectedIds.value)
    initialSelectedIds.value = [...selectedIds.value]
    await router.replace({
      name: ROUTE_NAMES.TENDENCY,
      query: { tab: 'principles' },
    })
  } catch {
    applyError.value = '원칙을 저장하지 못했어요. 잠시 후 다시 시도해주세요.'
  } finally {
    applying.value = false
  }
}

function handleBeforeUnload(event) {
  if (!hasUnsavedChanges.value) return
  event.preventDefault()
  event.returnValue = ''
}

watch(
  recommendations,
  (nextRecommendations) => {
    if (selectionInitialized.value || !nextRecommendations.length) return

    const defaultIds = nextRecommendations
      .slice(0, 2)
      .map((recommendation) => recommendation.recommendationId)
    selectedIds.value = defaultIds
    initialSelectedIds.value = [...defaultIds]
    selectionInitialized.value = true
  },
  { immediate: true },
)

onBeforeRouteLeave(() => {
  if (!hasUnsavedChanges.value) return true
  return window.confirm('선택한 내용이 저장되지 않았어요. 이 화면을 나갈까요?')
})

onMounted(async () => {
  await tendencyStore.fetchTendencies()
  if (tendencyStore.isAnalysisLocked) {
    await router.replace({
      name: ROUTE_NAMES.TENDENCY,
      query: { tab: 'principles' },
    })
    return
  }

  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <div class="recommendation-page">
    <header class="detail-app-bar">
      <button type="button" aria-label="이전 화면으로 돌아가기" @click="router.back()">
        <AppIcon name="chevron-left" :size="20" />
      </button>
      <div>
        <strong>추천 원칙 선택</strong>
        <span>필요한 원칙만 골라 담아보세요</span>
      </div>
      <span class="selection-count">{{ selectedCount }}개 선택</span>
    </header>

    <div v-if="tendencyStore.loading || tendencyStore.isAnalysisLocked" class="loading-wrapper">
      <BaseLoading />
    </div>

    <main v-else-if="recommendations.length" class="recommendation-content">
      <section class="tendency-summary">
        <button
          type="button"
          class="tendency-summary__toggle"
          :aria-expanded="tendencySummaryOpen"
          aria-controls="recommendation-tendency-summary"
          @click="tendencySummaryOpen = !tendencySummaryOpen"
        >
          <span class="tendency-summary__icon">
            <AppIcon name="sparkles" :size="15" />
          </span>
          <span>
            <strong>추천에 반영된 나의 성향</strong>
            <small>최근 90일 분석 결과</small>
          </span>
          <span class="tendency-summary__action">
            <small>{{ tendencySummaryOpen ? '접기' : '열기' }}</small>
            <AppIcon
              name="chevron-down"
              :size="15"
              class="tendency-summary__chevron"
              :class="{ 'tendency-summary__chevron--open': tendencySummaryOpen }"
            />
          </span>
        </button>

        <div
          v-show="tendencySummaryOpen"
          id="recommendation-tendency-summary"
          class="tendency-summary__grid"
        >
          <div
            v-for="result in tendencyStore.analysis?.analysisResults"
            :key="result.dimension.code"
          >
            <span>{{ result.dimension.name }}</span>
            <strong>{{ result.type.name }}</strong>
          </div>
        </div>
      </section>

      <section class="selection-section">
        <header>
          <div>
            <h1>성향 기반 추천 원칙</h1>
            <span>{{ recommendations.length }}개 추천</span>
          </div>
          <button type="button" @click="toggleAll">
            {{ allSelected ? '전체 해제' : '전체 선택' }}
          </button>
        </header>

        <div class="recommendation-list">
          <article
            v-for="(recommendation, index) in recommendations"
            :key="recommendation.recommendationId"
            class="recommendation-card"
            :class="{
              'recommendation-card--selected': isSelected(recommendation.recommendationId),
            }"
          >
            <span class="recommendation-card__index">
              {{ String(index + 1).padStart(2, '0') }}
            </span>

            <div class="recommendation-card__content">
              <strong>{{ recommendation.recommendationText }}</strong>
              <span>{{ recommendation.analysisType.name }} 기반</span>
            </div>

            <button
              type="button"
              class="recommendation-card__toggle"
              :class="{
                'recommendation-card__toggle--selected': isSelected(
                  recommendation.recommendationId,
                ),
              }"
              :aria-label="
                isSelected(recommendation.recommendationId)
                  ? `${recommendation.recommendationText} 선택 해제`
                  : `${recommendation.recommendationText} 선택`
              "
              @click="toggleRecommendation(recommendation.recommendationId)"
            >
              <AppIcon
                :name="isSelected(recommendation.recommendationId) ? 'check' : 'plus'"
                :size="15"
              />
            </button>
          </article>
        </div>
      </section>

      <p v-if="applyError" class="apply-error" role="alert">{{ applyError }}</p>

      <footer class="apply-bar">
        <BaseButton
          full-width
          :disabled="!selectedCount || applying"
          @click="applySelectedRecommendations"
        >
          {{ selectionButtonText }}
          <template #iconRight>
            <AppIcon name="arrow-right" :size="16" />
          </template>
        </BaseButton>
      </footer>
    </main>

    <section v-else class="complete-state">
      <span><AppIcon name="shield-check" :size="28" /></span>
      <strong>새로운 추천 원칙을 모두 확인했어요</strong>
      <p>적용한 추천 원칙은 다시 안내하지 않아요.</p>
      <BaseButton
        variant="secondary"
        @click="
          router.replace({
            name: ROUTE_NAMES.TENDENCY,
            query: { tab: 'principles' },
          })
        "
      >
        투자원칙 보기
      </BaseButton>
    </section>
  </div>
</template>

<style scoped>
.recommendation-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 13px;
  background: #ffffff;
  box-shadow: 0 0 0 20px #ffffff;
}

.detail-app-bar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 54px;
  margin: -20px -20px 0;
  padding: 10px 20px 7px;
  border-bottom: 1px solid rgba(222, 229, 229, 0.78);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(10px);
}

.detail-app-bar > button {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.72);
  color: #526164;
  cursor: pointer;
}

.detail-app-bar > div {
  display: grid;
  gap: 2px;
}

.detail-app-bar strong {
  color: #24383d;
  font-size: 14px;
  letter-spacing: -0.025em;
}

.detail-app-bar small,
.detail-app-bar > div span {
  color: #90999b;
  font-size: 8px;
}

.selection-count {
  min-width: 44px;
  padding: 5px 7px;
  border-radius: 7px;
  background: #e7f7f6;
  color: #087f7c;
  font-size: 9px;
  font-weight: 800;
  text-align: center;
}

.recommendation-content {
  display: grid;
  gap: 12px;
  padding-bottom: 4px;
}

.tendency-summary {
  overflow: hidden;
  border: 1px solid #d7e5e4;
  border-radius: 13px;
  background: #fff;
  box-shadow: 0 3px 12px rgba(34, 68, 70, 0.035);
}

.tendency-summary__toggle {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  width: 100%;
  min-height: 58px;
  padding: 10px 11px;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.tendency-summary__icon {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #e4f7f5;
  color: #0a928d;
}

.tendency-summary__toggle > span:nth-child(2) {
  display: grid;
  gap: 2px;
}

.tendency-summary__toggle strong {
  color: #33464a;
  font-size: 10px;
  letter-spacing: -0.02em;
}

.tendency-summary__toggle small {
  color: #929b9d;
  font-size: 8px;
}

.tendency-summary__action {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #0a8c88;
}

.tendency-summary__action small {
  color: inherit;
  font-size: 8px;
  font-weight: 750;
}

.tendency-summary__chevron {
  color: #768386;
  transition: transform 0.18s ease;
}

.tendency-summary__chevron--open {
  transform: rotate(180deg);
}

.tendency-summary__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  margin: 0 11px 11px;
  overflow: hidden;
  border: 1px solid #e6ecec;
  border-radius: 8px;
  background: #f8fafa;
}

.tendency-summary__grid > div {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  min-height: 31px;
  padding: 7px 8px;
  background: transparent;
}

.tendency-summary__grid > div:nth-child(odd) {
  border-right: 1px solid #e6ecec;
}

.tendency-summary__grid > div:nth-child(-n + 4) {
  border-bottom: 1px solid #e6ecec;
}

.tendency-summary__grid span,
.tendency-summary__grid strong {
  overflow: hidden;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tendency-summary__grid span {
  color: #8a9496;
}

.tendency-summary__grid strong {
  color: #0a8c88;
}

.selection-section {
  display: grid;
  gap: 8px;
}

.selection-section > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.selection-section > header > div {
  display: flex;
  align-items: center;
  gap: 7px;
}

.selection-section h1 {
  margin: 0;
  color: #263a43;
  font-size: 12px;
  letter-spacing: -0.025em;
}

.selection-section header span {
  padding: 3px 6px;
  border-radius: 6px;
  background: #e8f7f6;
  color: #087f7c;
  font-size: 8px;
  font-weight: 700;
}

.selection-section header button {
  padding: 4px 7px;
  border: 0;
  border-radius: 6px;
  background: #e8f7f6;
  color: #087f7c;
  cursor: pointer;
  font-size: 9px;
  font-weight: 700;
}

.recommendation-list {
  display: grid;
  gap: 6px;
}

.recommendation-card {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 32px;
  align-items: center;
  gap: 9px;
  min-height: 62px;
  padding: 9px 10px;
  border: 1px solid #e0e7e7;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(38, 58, 67, 0.025);
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.recommendation-card--selected {
  border-color: #6fc3bf;
  background: #eefafa;
}

.recommendation-card__index {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #f1f5f5;
  color: #8a9698;
  font-family: var(--font-mono);
  font-size: 8px;
}

.recommendation-card--selected .recommendation-card__index {
  background: #0b8f8b;
  color: #fff;
}

.recommendation-card__content {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.recommendation-card__content strong {
  color: #34464a;
  font-size: 9px;
  font-weight: 650;
  line-height: 1.45;
  letter-spacing: -0.015em;
}

.recommendation-card__content span {
  width: fit-content;
  color: #0a8c88;
  font-size: 8px;
  font-weight: 700;
}

.recommendation-card__toggle {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9px;
  background: #eaf8f7;
  color: #0a8c88;
  cursor: pointer;
}

.recommendation-card__toggle--selected {
  background: #0b8f8b;
  color: #fff;
}

.recommendation-card__toggle:disabled {
  background: #f2f4f4;
  color: #bdc5c6;
  cursor: not-allowed;
}

.recommendation-card__toggle:focus-visible,
.tendency-summary__toggle:focus-visible,
.detail-app-bar button:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: 2px;
}

.apply-error {
  margin: 0;
  color: #c14242;
  font-size: 9px;
  text-align: center;
}

.apply-bar {
  width: 100%;
  padding-top: 3px;
}

.complete-state {
  display: flex;
  min-height: 520px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  text-align: center;
}

.complete-state > span {
  display: inline-flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  border-radius: 50%;
  background: #e7f6f5;
  color: #0b8f8b;
}

.complete-state strong {
  color: #263a43;
  font-size: 14px;
}

.complete-state p {
  margin: 0 0 10px;
  color: #7b8789;
  font-size: 10px;
}

.loading-wrapper {
  display: flex;
  min-height: 500px;
  align-items: center;
  justify-content: center;
}

@media (max-width: 440px) {
  .recommendation-page {
    padding-top: 54px;
  }

  .detail-app-bar {
    position: fixed;
    top: var(--mobile-frame-edge-offset, 0px);
    left: 50%;
    width: min(100%, 390px);
    margin: 0;
    transform: translateX(-50%);
  }
}
</style>
