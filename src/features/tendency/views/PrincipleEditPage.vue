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
  RISK_MANAGEMENT: 'shield-check',
  PORTFOLIO_RISK_ALLOCATION: 'chart-pie',
  BUY_STRATEGY: 'chart-pie',
  BUY_JUDGMENT_BASIS: 'search',
  INVESTMENT_HORIZON: 'calendar-range',
  LOSS_RESPONSE: 'shield-check',
  PROFIT_RESPONSE: 'trending-up',
  PRINCIPLE_FULFILLMENT: 'refresh-cw',
  PSYCHOLOGY: 'compass',
})
const PRINCIPLE_TENDENCY_ICONS = Object.freeze({
  '손실 대응형': 'shield-check',
  '고변동 집중형': 'chart-pie',
  '분할 매수 3단계형': 'chart-pie',
  차익실현형: 'trending-up',
  기업분석형: 'search',
  장기투자형: 'calendar-range',
  원칙일치형: 'refresh-cw',
  보유형: 'shield-check',
  '감정 매매 방지 쿨다운형': 'compass',
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

function isUserCreatedPrinciple(principle) {
  return principle.recommendationSource?.type === 'USER_CREATED'
}

function getSourceLabel(principle) {
  if (isUserCreatedPrinciple(principle)) return '직접 작성'
  return principle.recommendationSource?.tendency?.name ?? principle.title ?? '투자성향'
}

function getSourceMeta(principle) {
  if (isUserCreatedPrinciple(principle)) return '직접 작성'
  return getSourceLabel(principle).replace(/형$/, '')
}

function getKeywordIcon(text) {
  if (/감정|충동|쿨다운|추격|복수/.test(text)) return 'compass'
  if (/손실|손절|리스크|위험|하락|보유/.test(text)) return 'shield-check'
  if (/수익|익절|차익|매도/.test(text)) return 'trending-up'
  if (/분할 매수|비중|집중|자산|포트폴리오/.test(text)) return 'chart-pie'
  if (/기업|분석|근거|실적/.test(text)) return 'search'
  if (/장기|기간|분기/.test(text)) return 'calendar-range'
  if (/원칙|이행|일지|기록|점검/.test(text)) return 'refresh-cw'
  return ''
}

function resolvePrincipleIcon(category, sourceName, content) {
  return (
    PRINCIPLE_ICONS[category] ||
    PRINCIPLE_TENDENCY_ICONS[sourceName] ||
    getKeywordIcon(sourceName || '') ||
    getKeywordIcon(content || '') ||
    'sparkles'
  )
}

function getPrincipleIcon(principle) {
  if (isUserCreatedPrinciple(principle)) return 'pencil'

  const tendency = principle.recommendationSource?.tendency
  return resolvePrincipleIcon(
    principle.category || tendency?.code,
    tendency?.name || principle.title,
    principle.content,
  )
}

function getRecommendationIcon(recommendation) {
  return resolvePrincipleIcon(
    recommendation.analysisType?.code,
    recommendation.analysisType?.name,
    recommendation.recommendationText,
  )
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

      <section v-if="draftPrinciples.length" class="edit-section edit-section--current">
        <header>
          <div>
            <h2><i aria-hidden="true"></i>현재 적용 중</h2>
            <p>문구를 다듬거나 필요 없는 원칙을 제외할 수 있어요.</p>
          </div>
          <span>{{ draftPrinciples.length }}개</span>
        </header>

        <div class="current-principles">
          <article
            v-for="(principle, index) in draftPrinciples"
            :key="principle.principleId"
            class="edit-principle"
            :class="{
              'is-user-created': isUserCreatedPrinciple(principle),
              'is-editing': editingId === principle.principleId,
            }"
          >
            <header class="edit-principle__header">
              <span class="edit-principle__icon" aria-hidden="true">
                <AppIcon :name="getPrincipleIcon(principle)" :size="14" />
              </span>
              <div class="edit-principle__meta">
                <span class="edit-principle__index">
                  원칙 {{ String(index + 1).padStart(2, '0') }}
                </span>
                <span class="edit-principle__separator" aria-hidden="true">·</span>
                <span class="edit-principle__origin">{{ getSourceMeta(principle) }}</span>
              </div>
              <div class="edit-principle__actions">
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
                    :size="13"
                  />
                </button>
                <button
                  type="button"
                  class="edit-principle__remove"
                  :aria-label="`${principle.content} 제외`"
                  @click="removePrinciple(principle.principleId)"
                >
                  <AppIcon name="minus" :size="14" />
                </button>
              </div>
            </header>
            <div class="edit-principle__content">
              <textarea
                v-if="editingId === principle.principleId"
                v-model="principle.content"
                rows="2"
                :aria-label="`${getSourceLabel(principle)} 원칙 문구 수정`"
              />
              <strong v-else>{{ principle.content }}</strong>
            </div>
          </article>
        </div>
      </section>

      <section class="custom-principle">
        <button v-if="!customFormOpen" type="button" @click="customFormOpen = true">
          <span class="custom-principle__icon" aria-hidden="true">
            <AppIcon name="pencil" :size="14" />
          </span>
          <span>
            <strong>직접 작성한 원칙 추가</strong>
            <small>나만의 투자 기준을 한 문장으로 적어보세요.</small>
          </span>
          <AppIcon name="plus" :size="16" />
        </button>
        <div v-else class="custom-principle__form">
          <header>
            <span class="custom-principle__icon" aria-hidden="true">
              <AppIcon name="pencil" :size="14" />
            </span>
            <div>
              <strong>직접 작성</strong>
              <small>실제로 지킬 수 있는 기준을 구체적으로 적어보세요.</small>
            </div>
          </header>
          <textarea
            v-model="customText"
            rows="2"
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

      <section
        v-if="!isCreateMode && availableRecommendations.length"
        class="edit-section edit-section--recommendations"
      >
        <header>
          <div>
            <h2><AppIcon name="sparkles" :size="16" />추천 원칙</h2>
            <p>투자성향을 바탕으로 만든 원칙이에요.</p>
          </div>
          <span>{{ availableRecommendations.length }}개 추천</span>
        </header>

        <div class="available-principles">
          <article
            v-for="(recommendation, index) in availableRecommendations"
            :key="recommendation.recommendationId"
          >
            <header>
              <span class="available-principles__icon" aria-hidden="true">
                <AppIcon :name="getRecommendationIcon(recommendation)" :size="14" />
              </span>
              <div class="available-principles__meta">
                <span class="available-principles__index">
                  추천 {{ String(index + 1).padStart(2, '0') }}
                </span>
                <span class="available-principles__separator" aria-hidden="true">·</span>
                <span class="available-principles__origin">
                  {{ recommendation.analysisType.name.replace(/형$/, '') }}
                </span>
              </div>
              <button
                type="button"
                :aria-label="`${recommendation.recommendationText} 추가`"
                @click="addRecommendation(recommendation)"
              >
                <AppIcon name="plus" :size="15" />
              </button>
            </header>
            <strong>{{ recommendation.recommendationText }}</strong>
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
  background: #fbfcfc;
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
  gap: 17px;
  padding: 8px 20px 98px;
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
  gap: 10px;
}

.edit-section > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.edit-section > header > div {
  display: grid;
  gap: 2px;
}

.edit-section h2 {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #34474b;
  font-size: var(--font-size-body);
}

.edit-section > header p {
  margin: 0;
  color: #929c9e;
  font-size: 10px;
  line-height: 1.35;
}

.edit-section header span {
  color: #879294;
  font-size: 10px;
  font-weight: 750;
}

.current-principles,
.available-principles {
  display: grid;
  gap: 8px;
}

.edit-principle {
  display: flex;
  min-height: 96px;
  flex-direction: column;
  gap: 7px;
  padding: 11px 12px 12px;
  border: 1px solid #dce8e7;
  border-radius: 15px;
  background: #ffffff;
  box-shadow:
    0 2px 3px rgba(27, 73, 77, 0.03),
    0 9px 21px rgba(27, 73, 77, 0.065);
}

.edit-principle.is-user-created {
  border-color: #e2dceb;
  background: #fdfcfe;
  box-shadow:
    0 2px 3px rgba(85, 64, 105, 0.025),
    0 9px 21px rgba(85, 64, 105, 0.06);
}

.edit-principle.is-editing {
  border-color: #9dcfcb;
  box-shadow: 0 0 0 3px rgba(11, 145, 140, 0.08);
}

.edit-principle.is-user-created.is-editing {
  border-color: #c9bdd8;
  box-shadow: 0 0 0 3px rgba(116, 100, 135, 0.08);
}

.edit-principle__header,
.available-principles article > header {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
}

.edit-principle__content {
  min-width: 0;
}

.edit-principle__content textarea {
  min-width: 0;
}

.edit-principle strong,
.available-principles strong {
  display: -webkit-box;
  color: #273a3f;
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.42;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: break-word;
  word-break: keep-all;
}

.edit-principle__icon,
.available-principles__icon,
.custom-principle__icon {
  display: inline-flex;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  align-items: center;
  justify-content: center;
  border: 1px solid #cfe6e4;
  border-radius: 8px;
  background: #edf8f7;
  color: #187f80;
}

.edit-principle.is-user-created .edit-principle__icon,
.custom-principle__icon {
  border-color: #ded7e9;
  background: #f3eff7;
  color: #746487;
}

.edit-principle__meta,
.available-principles__meta {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 5px;
  overflow: hidden;
}

.edit-principle__index,
.available-principles__index {
  color: #347f7a;
  font-family: var(--font-heading);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.edit-principle.is-user-created .edit-principle__index {
  color: #766487;
}

.edit-principle__separator,
.available-principles__separator {
  color: #9aa8a9;
  font-size: 11px;
  font-weight: 700;
}

.edit-principle__origin,
.available-principles__origin {
  min-width: 0;
  color: #356f6b;
  font-size: 11px;
  font-weight: 750;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-principle.is-user-created .edit-principle__origin {
  padding: 3px 7px;
  border-radius: 999px;
  background: #f1edf6;
  color: #746487;
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

.edit-principle__actions {
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
}

.edit-principle__edit {
  background: #f2f6f6;
  color: #5c6f72;
}

.edit-principle__remove {
  background: #f8f1ef;
  color: #b86a62;
}

.available-principles article {
  display: flex;
  min-height: 91px;
  flex-direction: column;
  gap: 7px;
  padding: 10px 12px 11px;
  border: 1px solid #e1e9e8;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 6px 16px rgba(27, 73, 77, 0.045);
}

.available-principles button {
  flex: 0 0 auto;
  background: #e9f7f6;
  color: #0a918c;
}

.custom-principle {
  border: 1px solid #e0dae9;
  border-radius: 15px;
  background: #fdfcfe;
  box-shadow: 0 6px 18px rgba(85, 64, 105, 0.045);
}

.custom-principle > button {
  display: grid;
  width: 100%;
  min-height: 62px;
  grid-template-columns: 26px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  border: 0;
  background: transparent;
  color: #746487;
  cursor: pointer;
  text-align: left;
}

.custom-principle > button > span:nth-child(2) {
  display: grid;
  gap: 2px;
}

.custom-principle strong {
  color: #544a62;
  font-size: 13px;
  font-weight: 800;
}

.custom-principle small {
  color: #938b9c;
  font-size: 10px;
  line-height: 1.35;
}

.custom-principle__form {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.custom-principle__form > header {
  display: flex;
  align-items: center;
  gap: 9px;
}

.custom-principle__form > header > div {
  display: grid;
  gap: 2px;
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
  width: min(100%, var(--app-content-inline-size, 390px));
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
