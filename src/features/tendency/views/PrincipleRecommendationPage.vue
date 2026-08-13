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
      <h1>추천 원칙 선택</h1>
    </header>

    <div v-if="tendencyStore.loading || tendencyStore.isAnalysisLocked" class="loading-wrapper">
      <BaseLoading />
    </div>

    <main v-else-if="recommendations.length" class="recommendation-content">
      <section class="recommendation-intro">
        <div class="recommendation-intro__eyebrow">
          <AppIcon name="sparkles" :size="14" />
          <span>성향 기반 추천</span>
        </div>
        <span class="recommendation-intro__badge">{{ selectedCount }}개 선택 중</span>
        <strong>필요한 원칙만<br /><em>골라 담아보세요.</em></strong>
        <p>
          최근 90일의 투자성향을 바탕으로 준비했어요.<br />지금 필요한 원칙만 선택해 적용해보세요.
        </p>
        <img
          class="recommendation-intro__monkey"
          src="/assets/images/recommendation-guide-monkey-v2.png"
          alt=""
          aria-hidden="true"
        />
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
              <span>{{ recommendation.analysisType.name }} 기반</span>
              <strong>{{ recommendation.recommendationText }}</strong>
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

      <footer class="apply-bar">
        <p v-if="applyError" class="apply-error" role="alert">{{ applyError }}</p>
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

:global(.mobile-main:has(.recommendation-page)) {
  background: #ffffff;
}

.detail-app-bar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  min-height: 66px;
  margin: -20px -20px 0;
  padding: 0 16px;
  background: #ffffff;
}

.detail-app-bar > button {
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid #e1e8e8;
  border-radius: 50%;
  background: #ffffff;
  color: #263a43;
  cursor: pointer;
}

.detail-app-bar > button:hover {
  background: #f3f6f6;
}

.detail-app-bar h1 {
  margin: 0;
  overflow: hidden;
  color: #181817;
  font-family: var(--font-heading);
  font-size: var(--font-size-title-md);
  font-weight: 700;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommendation-content {
  display: grid;
  gap: 12px;
  padding-bottom: 92px;
}

.recommendation-intro {
  position: relative;
  display: grid;
  min-height: 158px;
  margin-top: 22px;
  align-content: center;
  gap: 8px;
  overflow: hidden;
  padding: 20px 92px 20px 18px;
  border-radius: 18px;
  background:
    radial-gradient(circle at 92% 12%, rgba(26, 189, 179, 0.22), transparent 36%),
    linear-gradient(135deg, #263a43 0%, #18333c 100%);
  box-shadow: 0 9px 22px rgba(28, 48, 56, 0.18);
  color: #ffffff;
}

.recommendation-intro::after {
  position: absolute;
  right: -22px;
  bottom: -40px;
  width: 130px;
  height: 130px;
  border: 1px solid rgba(94, 224, 215, 0.18);
  border-radius: 50%;
  box-shadow: 0 0 0 18px rgba(94, 224, 215, 0.04);
  content: '';
}

.recommendation-intro__eyebrow {
  position: relative;
  z-index: 2;
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 5px;
  color: #70ddd6;
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.recommendation-intro__badge {
  position: absolute;
  z-index: 3;
  top: 14px;
  right: 14px;
  padding: 6px 9px;
  border: 1px solid rgba(112, 221, 214, 0.36);
  border-radius: 999px;
  background: #0b8f8b;
  color: #ffffff;
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.recommendation-intro > strong {
  position: relative;
  z-index: 2;
  font-size: 19px;
  font-weight: 900;
  line-height: 1.35;
  letter-spacing: -0.035em;
}

.recommendation-intro > strong em {
  color: #65d9d2;
  font-style: normal;
}

.recommendation-intro > p {
  position: relative;
  z-index: 2;
  margin: 0;
  color: #c8d6d9;
  font-size: var(--font-size-caption);
  line-height: 1.55;
}

.recommendation-intro__monkey {
  position: absolute;
  z-index: 1;
  right: 4px;
  bottom: -6px;
  width: 88px;
  height: auto;
  pointer-events: none;
  user-select: none;
}

.selection-section {
  display: grid;
  margin-top: 15px;
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
  font-size: var(--font-size-body);
  letter-spacing: -0.025em;
}

.selection-section header span {
  padding: 3px 6px;
  border-radius: 6px;
  background: #e8f7f6;
  color: #087f7c;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.selection-section header button {
  padding: 4px 7px;
  border: 0;
  border-radius: 6px;
  background: #e8f7f6;
  color: #087f7c;
  cursor: pointer;
  font-size: var(--font-size-caption);
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
  min-height: 72px;
  padding: 10px;
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
  font-size: var(--font-size-caption);
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
  font-size: 14px; /* 추천 원칙 글씨 크기 조정 */
  font-weight: 650;
  line-height: 1.4;
  letter-spacing: -0.015em;
}

.recommendation-card__content span {
  width: fit-content;
  color: #0a8c88;
  font-size: var(--font-size-caption);
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
.detail-app-bar button:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: 2px;
}

.apply-error {
  margin: 0;
  color: #c14242;
  font-size: var(--font-size-caption);
  text-align: center;
}

.apply-bar {
  position: fixed;
  z-index: 160;
  right: max(16px, calc((100vw - 390px) / 2 + 16px));
  bottom: calc(var(--mobile-frame-edge-offset, 0px) + 84px);
  display: grid;
  width: min(calc(100% - 32px), 358px);
  gap: 7px;
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
  font-size: var(--font-size-body);
}

.complete-state p {
  margin: 0 0 10px;
  color: #7b8789;
  font-size: var(--font-size-caption);
}

.loading-wrapper {
  display: flex;
  min-height: 500px;
  align-items: center;
  justify-content: center;
}

@media (max-width: 440px) {
  .recommendation-page {
    padding-top: 66px;
  }

  .recommendation-content {
    padding-top: 14px;
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
