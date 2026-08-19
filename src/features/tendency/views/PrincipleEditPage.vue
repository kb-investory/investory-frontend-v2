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
const draftPrinciples = ref([])
const initialSnapshot = ref('')
const editingId = ref(null)
const customFormOpen = ref(false)
const customText = ref('')
const saving = ref(false)
const saveError = ref('')
const initialized = ref(false)

const PRINCIPLE_ICONS = Object.freeze({
  PORTFOLIO_RISK_ALLOCATION: 'chart-pie',
  BUY_JUDGMENT_BASIS: 'search',
  INVESTMENT_HORIZON: 'calendar-range',
  LOSS_RESPONSE: 'shield-check',
  PROFIT_RESPONSE: 'trending-up',
  PRINCIPLE_FULFILLMENT: 'refresh-cw',
})

const currentSnapshot = computed(() =>
  JSON.stringify(
    draftPrinciples.value.map((principle) => ({
      principleId: principle.principleId,
      content: principle.content,
    })),
  ),
)
const isCreateMode = computed(() => !tendencyStore.principles.length)
const hasUnsavedChanges = computed(
  () => initialized.value && currentSnapshot.value !== initialSnapshot.value,
)
const availableRecommendations = computed(() =>
  tendencyStore.recommendations.filter(
    (recommendation) =>
      !draftPrinciples.value.some(
        (principle) =>
          String(principle.principleId) === `recommendation-${recommendation.recommendationId}`,
      ),
  ),
)

function clonePrinciples(principles) {
  return principles.map((principle) => ({
    ...principle,
    recommendationSource: principle.recommendationSource
      ? {
          ...principle.recommendationSource,
          tendency: principle.recommendationSource.tendency
            ? { ...principle.recommendationSource.tendency }
            : undefined,
        }
      : undefined,
  }))
}

function formatSourceDate(date) {
  if (!date) return ''

  const [year, month, day] = String(date).split('-')
  if (!year || !month || !day) return String(date)
  return `${year}. ${month}. ${day}`
}

function isUserCreatedPrinciple(principle) {
  return principle.recommendationSource?.type === 'USER_CREATED'
}

function getSourceLabel(principle) {
  if (isUserCreatedPrinciple(principle)) return '사용자 작성'
  return principle.recommendationSource?.tendency?.name ?? principle.title ?? '투자성향'
}

function getSourceMeta(principle) {
  if (isUserCreatedPrinciple(principle)) {
    const date = formatSourceDate(principle.modifiedDate || principle.appliedDate)
    return date ? `사용자 작성 · ${date}` : '사용자 작성'
  }

  return `${getSourceLabel(principle)} 기반`
}

function getPrincipleIcon(category) {
  return PRINCIPLE_ICONS[category] || 'sparkles'
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function removePrinciple(principleId) {
  const removed = draftPrinciples.value.find((principle) => principle.principleId === principleId)
  draftPrinciples.value = draftPrinciples.value.filter(
    (principle) => principle.principleId !== principleId,
  )
  if (editingId.value === principleId) editingId.value = null

  if (removed?.recommendationId != null) {
    tendencyStore.restoreRecommendation({
      recommendationId: removed.recommendationId,
      recommendationText: removed.originalContent,
      recommendationReason: '',
      analysisType: {
        code: removed.category,
        name: removed.recommendationSource?.tendency?.name || removed.title || '투자성향',
      },
      recommendationStatus: 'NEW',
    })
  }
}

function addRecommendation(recommendation) {
  const today = getLocalDateKey()

  draftPrinciples.value = [
    ...draftPrinciples.value,
    {
      principleId: `recommendation-${recommendation.recommendationId}`,
      // 저장 시 이 값이 없으면 서버가 원칙을 DIRECT(사용자 작성)로 판정해 성향 기반 라벨이 사라진다.
      recommendationId: recommendation.recommendationId,
      title: recommendation.analysisType.name,
      content: recommendation.recommendationText,
      originalContent: recommendation.recommendationText,
      category: recommendation.analysisType.code,
      isActive: true,
      isUserModified: false,
      sortOrder: draftPrinciples.value.length + 1,
      appliedDate: today,
      recommendationSource: {
        type: 'TENDENCY_ANALYSIS',
        label: '투자성향 기반 추천',
        analysisRunId: tendencyStore.analysis?.analysisRunId,
        tendency: recommendation.analysisType,
      },
    },
  ]
}

function addCustomPrinciple() {
  const content = customText.value.trim()
  if (!content) return

  const today = getLocalDateKey()

  draftPrinciples.value = [
    ...draftPrinciples.value,
    {
      principleId: `custom-${Date.now()}`,
      title: '직접 작성',
      content,
      originalContent: content,
      category: 'CUSTOM',
      isActive: true,
      isUserModified: true,
      sortOrder: draftPrinciples.value.length + 1,
      appliedDate: today,
      modifiedDate: today,
      recommendationSource: {
        type: 'USER_CREATED',
        label: '직접 작성',
      },
    },
  ]
  customText.value = ''
  customFormOpen.value = false
}

async function saveChanges() {
  if (saving.value) return

  saving.value = true
  saveError.value = ''

  try {
    await tendencyStore.savePrincipleEdits(draftPrinciples.value)
    initialSnapshot.value = currentSnapshot.value
    await router.replace({
      name: ROUTE_NAMES.TENDENCY,
      query: { tab: 'principles' },
    })
  } catch {
    saveError.value = '변경한 원칙을 저장하지 못했어요. 다시 시도해주세요.'
  } finally {
    saving.value = false
  }
}

function handleBeforeUnload(event) {
  if (!hasUnsavedChanges.value) return
  event.preventDefault()
  event.returnValue = ''
}

watch(
  [() => tendencyStore.principles, () => tendencyStore.analysis],
  ([principles]) => {
    if (initialized.value) return
    draftPrinciples.value = clonePrinciples(principles || [])
    initialSnapshot.value = currentSnapshot.value
    customFormOpen.value = !principles?.length
    initialized.value = true
  },
  { immediate: true },
)

onBeforeRouteLeave(() => {
  if (!hasUnsavedChanges.value) return true
  return window.confirm('변경한 투자원칙이 저장되지 않았어요. 이 화면을 나갈까요?')
})

onMounted(async () => {
  await tendencyStore.fetchTendencies()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <div class="principle-edit-page">
    <header class="edit-app-bar">
      <button type="button" aria-label="투자원칙 화면으로 돌아가기" @click="router.back()">
        <AppIcon name="chevron-left" :size="20" />
      </button>
      <strong>{{ isCreateMode ? '투자원칙 작성' : '투자원칙 수정' }}</strong>
    </header>

    <div v-if="tendencyStore.loading || !initialized" class="loading-wrapper">
      <BaseLoading />
    </div>

    <main v-else class="edit-content">
      <header class="edit-hero">
        <h1>{{ isCreateMode ? '나만의 원칙을 작성해볼까요?' : '원칙을 정리해볼까요?' }}</h1>
        <p>
          {{
            isCreateMode
              ? '실제 투자에서 지키고 싶은 기준을 편하게 적어보세요.'
              : '필요한 원칙만 남기고 새 원칙을 더할 수 있어요.'
          }}
        </p>
      </header>

      <div class="principle-summary" aria-label="투자원칙 구성 요약">
        <span class="principle-summary__current">
          <i aria-hidden="true"></i>
          적용 중 {{ draftPrinciples.length }}
        </span>
        <span v-if="!isCreateMode">
          <AppIcon name="sparkles" :size="14" />
          추천 {{ availableRecommendations.length }}
        </span>
      </div>

      <section v-if="draftPrinciples.length" class="edit-section">
        <header>
          <h2><i aria-hidden="true"></i>현재 적용 중 · 수정 또는 제외</h2>
          <span>현재 적용 중인 {{ draftPrinciples.length }}개</span>
        </header>

        <div class="current-principles">
          <article
            v-for="(principle, index) in draftPrinciples"
            :key="principle.principleId"
            class="edit-principle"
          >
            <span class="edit-principle__index">{{ String(index + 1).padStart(2, '0') }}</span>
            <div class="edit-principle__body">
              <span>{{ getSourceMeta(principle) }}</span>
              <textarea
                v-if="editingId === principle.principleId"
                v-model="principle.content"
                rows="3"
                :aria-label="`${getSourceLabel(principle)} 원칙 문구 수정`"
              />
              <strong v-else>{{ principle.content }}</strong>
            </div>
            <button
              type="button"
              class="edit-principle__edit"
              :aria-label="
                editingId === principle.principleId
                  ? `${principle.content} 수정 완료`
                  : `${principle.content} 수정`
              "
              @click="
                editingId = editingId === principle.principleId ? null : principle.principleId
              "
            >
              <AppIcon
                :name="editingId === principle.principleId ? 'check' : 'pencil'"
                :size="14"
              />
            </button>
            <button
              type="button"
              class="edit-principle__remove"
              :aria-label="`${principle.content} 제외`"
              @click="removePrinciple(principle.principleId)"
            >
              <AppIcon name="minus" :size="15" />
            </button>
          </article>
        </div>
      </section>

      <section class="custom-principle">
        <button v-if="!customFormOpen" type="button" @click="customFormOpen = true">
          <AppIcon name="plus" :size="16" />
          직접 작성해서 추가
        </button>
        <div v-else class="custom-principle__form">
          <textarea
            v-model="customText"
            rows="3"
            placeholder="예: 매수 전 투자 근거를 세 가지 이상 확인한다"
            aria-label="직접 작성할 투자원칙"
          />
          <div>
            <button type="button" @click="customFormOpen = false">취소</button>
            <button type="button" :disabled="!customText.trim()" @click="addCustomPrinciple">
              추가하기
            </button>
          </div>
        </div>
      </section>

      <section v-if="!isCreateMode && availableRecommendations.length" class="edit-section">
        <header>
          <h2><AppIcon name="sparkles" :size="17" />추천 원칙 추가하기</h2>
          <span>{{ availableRecommendations.length }}개 추천</span>
        </header>

        <div class="available-principles">
          <article
            v-for="recommendation in availableRecommendations"
            :key="recommendation.recommendationId"
          >
            <span class="available-principles__icon">
              <AppIcon :name="getPrincipleIcon(recommendation.analysisType.code)" :size="17" />
            </span>
            <div>
              <span>{{ recommendation.analysisType.name }} 기반</span>
              <strong>{{ recommendation.recommendationText }}</strong>
            </div>
            <button
              type="button"
              :aria-label="`${recommendation.recommendationText} 추가`"
              @click="addRecommendation(recommendation)"
            >
              <AppIcon name="plus" :size="16" />
            </button>
          </article>
        </div>
      </section>

      <section
        v-else-if="!isCreateMode && tendencyStore.recommendationGenerationStatus === 'REQUESTED'"
        class="edit-section"
      >
        <header>
          <h2><AppIcon name="sparkles" :size="17" />추천 원칙 추가하기</h2>
        </header>

        <div class="available-principles-loading">
          <span class="available-principles-loading__spinner">
            <AppIcon name="loader-circle" :size="20" />
          </span>
          <p>추천 원칙을 만들고 있어요. 잠시 후 다시 확인해주세요.</p>
        </div>
      </section>

      <p v-if="saveError" class="save-error" role="alert">{{ saveError }}</p>

      <footer class="save-bar">
        <BaseButton
          full-width
          :disabled="saving || (isCreateMode && !draftPrinciples.length)"
          @click="saveChanges"
        >
          <template #iconLeft><AppIcon name="check" :size="15" /></template>
          {{ saving ? '저장하는 중...' : `변경한 원칙 ${draftPrinciples.length}개 저장하기` }}
        </BaseButton>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.principle-edit-page {
  min-height: 100%;
  background: #ffffff;
}

.edit-app-bar {
  position: sticky;
  z-index: 40;
  top: 0;
  display: grid;
  width: 100%;
  min-height: 64px;
  grid-template-columns: 36px minmax(0, 1fr) 36px;
  align-items: center;
  gap: 8px;
  padding: 12px 16px 10px;
  background: #ffffff;
}

.edit-app-bar button {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: #fff;
  color: #526164;
  cursor: pointer;
}

.edit-app-bar strong {
  grid-column: 2;
  color: #24383d;
  font-size: var(--font-size-body);
  text-align: center;
}

.edit-content {
  display: grid;
  gap: 14px;
  padding: 8px 20px 92px;
}

.edit-hero h1,
.edit-hero p,
.edit-section h2,
.save-error {
  margin: 0;
}

.edit-hero {
  display: grid;
  gap: 5px;
}

.edit-hero h1 {
  color: #1f3034;
  font-size: var(--font-size-title-md);
  letter-spacing: -0.045em;
}

.edit-hero p {
  color: #879194;
  font-size: var(--font-size-caption);
  line-height: 1.45;
}

.principle-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 5px;
  border-radius: 13px;
  background: #f0f4f4;
  color: #849092;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.principle-summary > span {
  display: flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
}

.principle-summary > span:only-child {
  grid-column: 1 / -1;
}

.principle-summary__current {
  background: #ffffff;
  color: #32474b;
  box-shadow: 0 2px 7px rgba(32, 58, 62, 0.05);
}

.principle-summary i,
.edit-section h2 i {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #0b918c;
}

.edit-section {
  display: grid;
  gap: 7px;
}

.edit-section > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.edit-section h2 {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #34474b;
  font-size: var(--font-size-body);
}

.edit-section header span {
  color: #879294;
  font-size: 10px;
  font-weight: 750;
}

.available-principles {
  overflow: hidden;
  border: 1px solid #dce5e5;
  border-radius: 14px;
  background: #fff;
}

.current-principles {
  display: grid;
  gap: 8px;
}

.edit-principle {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 32px;
  grid-template-rows: repeat(2, auto);
  align-items: center;
  gap: 6px 10px;
  min-height: 88px;
  padding: 11px;
  border: 1px solid #d8e3e4;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 3px 9px rgba(34, 60, 64, 0.045);
}

.available-principles article:last-child {
  border-bottom: 0;
}

.edit-principle__index {
  display: inline-flex;
  width: 44px;
  height: 44px;
  grid-row: 1 / 3;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #0b918c;
  color: #ffffff;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.edit-principle__body,
.available-principles article > div {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.edit-principle__body {
  grid-row: 1 / 3;
}

.edit-principle strong,
.available-principles strong {
  color: #35474b;
  font-size: 14px;
  line-height: 1.45;
}

.edit-principle__body > span,
.available-principles article span {
  grid-row: 1;
  width: fit-content;
  padding: 3px 6px;
  border-radius: 6px;
  background: #f4f6f6;
  color: #778486;
  font-size: 10px;
}

.edit-principle textarea,
.custom-principle textarea {
  width: 100%;
  resize: vertical;
  border: 1px solid #a7d6d3;
  border-radius: 8px;
  background: #fff;
  color: #35474b;
  font: inherit;
  font-size: 14px;
  line-height: 1.55;
  padding: 10px;
}

.edit-principle button,
.available-principles button {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9px;
  cursor: pointer;
}

.edit-principle__edit {
  align-self: end;
  background: transparent;
  color: #607174;
}

.edit-principle__remove {
  grid-column: 3;
  grid-row: 2;
  align-self: start;
  background: #fff1ef;
  color: #df5e59;
}

.available-principles article {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 32px;
  align-items: center;
  gap: 10px;
  min-height: 76px;
  padding: 11px 10px;
  border-bottom: 1px solid #edf0f0;
}

.available-principles__icon {
  display: inline-flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #edf8f7;
  color: #0a8e89;
}

.available-principles button {
  background: #e9f8f7;
  color: #0a918c;
}

.custom-principle {
  border: 1px solid #dce5e5;
  border-radius: 14px;
  background: #fff;
}

.custom-principle > button {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: #687679;
  cursor: pointer;
  font-size: var(--font-size-body);
}

.custom-principle__form {
  display: grid;
  gap: 8px;
  padding: 11px;
}

.custom-principle__form > div {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.custom-principle__form button {
  padding: 6px 10px;
  border: 0;
  border-radius: 7px;
  background: #edf2f2;
  color: #657275;
  cursor: pointer;
  font-size: var(--font-size-caption);
}

.custom-principle__form button:last-child {
  background: #0b8f8b;
  color: #fff;
}

.custom-principle__form button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.save-error {
  color: #c14242;
  font-size: var(--font-size-caption);
  text-align: center;
}

.save-bar {
  position: fixed;
  z-index: 30;
  bottom: var(--mobile-frame-edge-offset, 0px);
  left: 50%;
  width: min(100%, 390px);
  padding: 10px 20px 20px;
  border-top: 1px solid #e0e7e7;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(10px);
  transform: translateX(-50%);
}

.loading-wrapper {
  display: flex;
  min-height: 520px;
  align-items: center;
  justify-content: center;
}

.available-principles-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 0;
  color: #7b8789;
  font-size: var(--font-size-caption);
  text-align: center;
}

.available-principles-loading__spinner {
  display: inline-flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #edf8f7;
  color: #0a8e89;
  animation: available-principles-loading-spin 1s linear infinite;
}

@keyframes available-principles-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .available-principles-loading__spinner {
    animation: none;
  }
}
</style>
