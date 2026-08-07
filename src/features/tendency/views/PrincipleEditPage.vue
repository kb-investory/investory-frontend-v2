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

const currentSnapshot = computed(() =>
  JSON.stringify(
    draftPrinciples.value.map((principle) => ({
      principleId: principle.principleId,
      content: principle.content,
    })),
  ),
)
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

function getSourceLabel(principle) {
  return principle.recommendationSource?.tendency?.name ?? principle.title ?? '직접 작성'
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function removePrinciple(principleId) {
  draftPrinciples.value = draftPrinciples.value.filter(
    (principle) => principle.principleId !== principleId,
  )
  if (editingId.value === principleId) editingId.value = null
}

function addRecommendation(recommendation) {
  const today = getLocalDateKey()

  draftPrinciples.value = [
    ...draftPrinciples.value,
    {
      principleId: `recommendation-${recommendation.recommendationId}`,
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
  [() => tendencyStore.analysis, () => tendencyStore.principles],
  ([analysis, principles]) => {
    if (initialized.value || !analysis) return
    draftPrinciples.value = clonePrinciples(principles)
    initialSnapshot.value = currentSnapshot.value
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
  <div class="principle-edit-page">
    <header class="edit-app-bar">
      <button type="button" aria-label="투자원칙 화면으로 돌아가기" @click="router.back()">
        <AppIcon name="chevron-left" :size="20" />
      </button>
      <strong>투자원칙 수정</strong>
      <span>{{ draftPrinciples.length }}개 적용 중</span>
    </header>

    <div
      v-if="tendencyStore.loading || tendencyStore.isAnalysisLocked || !initialized"
      class="loading-wrapper"
    >
      <BaseLoading />
    </div>

    <main v-else class="edit-content">
      <header class="edit-hero">
        <h1>나의 투자원칙을 편집하세요</h1>
        <p>적용 중인 원칙은 수정·제외하고, 추천 원칙은 새로 추가할 수 있어요.</p>
      </header>

      <section class="edit-guide">
        <span><AppIcon name="settings" :size="17" /></span>
        <div>
          <strong>추천 확인 → 원칙 선택 → 저장</strong>
          <p>추천 목록에서 원칙을 더한 뒤 아래 저장 버튼을 눌러 적용해주세요.</p>
        </div>
      </section>

      <section class="edit-section">
        <header>
          <h2>현재 적용 중 · 수정 또는 제외</h2>
          <span>{{ draftPrinciples.length }}개</span>
        </header>

        <div class="current-principles">
          <article
            v-for="principle in draftPrinciples"
            :key="principle.principleId"
            class="edit-principle"
          >
            <div class="edit-principle__body">
              <textarea
                v-if="editingId === principle.principleId"
                v-model="principle.content"
                rows="3"
                :aria-label="`${getSourceLabel(principle)} 원칙 문구 수정`"
              />
              <strong v-else>{{ principle.content }}</strong>
              <span>{{ getSourceLabel(principle) }} 기반</span>
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

      <section v-if="availableRecommendations.length" class="edit-section">
        <header>
          <h2>추천 원칙 · 추가하기</h2>
          <span>{{ availableRecommendations.length }}개 추천</span>
        </header>

        <div class="available-principles">
          <article
            v-for="recommendation in availableRecommendations"
            :key="recommendation.recommendationId"
          >
            <div>
              <strong>{{ recommendation.recommendationText }}</strong>
              <span>{{ recommendation.analysisType.name }} 기반</span>
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

      <section class="custom-principle">
        <button v-if="!customFormOpen" type="button" @click="customFormOpen = true">
          <AppIcon name="plus" :size="16" />
          직접 작성해서 추가
        </button>
        <div v-else class="custom-principle__form">
          <textarea
            v-model="customText"
            rows="3"
            placeholder="나만의 투자원칙을 입력하세요"
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

      <p v-if="saveError" class="save-error" role="alert">{{ saveError }}</p>

      <footer class="save-bar">
        <BaseButton full-width :disabled="saving" @click="saveChanges">
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
  grid-template-columns: 36px minmax(0, 1fr) auto;
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
  color: #24383d;
  font-size: var(--font-size-body);
  text-align: center;
}

.edit-app-bar > span {
  padding: 5px 7px;
  border-radius: 7px;
  background: #e7f7f6;
  color: #087f7c;
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.edit-content {
  display: grid;
  gap: 13px;
  padding: 8px 20px 92px;
}

.edit-hero h1,
.edit-hero p,
.edit-guide p,
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
  font-family: var(--font-heading);
  font-size: var(--font-size-title-md);
  letter-spacing: -0.045em;
}

.edit-hero p {
  color: #879194;
  font-size: var(--font-size-caption);
  line-height: 1.45;
}

.edit-guide {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 9px;
  padding: 11px;
  border: 1px solid #c7e5e3;
  border-radius: 11px;
  background: #f0faf9;
}

.edit-guide > span {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: #0b8f8b;
  color: #fff;
}

.edit-guide strong {
  color: #314649;
  font-size: var(--font-size-body);
  line-height: 1.4;
}

.edit-guide p {
  margin-top: 4px;
  color: #7b888a;
  font-size: var(--font-size-caption);
  line-height: 1.45;
}

.edit-section {
  display: grid;
  gap: 7px;
}

.edit-section > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.edit-section h2 {
  color: #34474b;
  font-size: var(--font-size-body);
}

.edit-section header span {
  color: #0a8c88;
  font-size: var(--font-size-caption);
  font-weight: 750;
}

.current-principles,
.available-principles {
  overflow: hidden;
  border: 1px solid #dce5e5;
  border-radius: 11px;
  background: #fff;
}

.edit-principle {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 32px 32px;
  align-items: center;
  gap: 6px;
  padding: 11px;
  border-bottom: 1px solid #edf0f0;
}

.edit-principle:last-child,
.available-principles article:last-child {
  border-bottom: 0;
}

.edit-principle__body,
.available-principles article > div {
  display: grid;
  min-width: 0;
  gap: 6px;
}

.edit-principle strong,
.available-principles strong {
  color: #35474b;
  font-size: var(--font-size-body);
  line-height: 1.45;
}

.edit-principle__body > span,
.available-principles article span {
  width: fit-content;
  padding: 3px 6px;
  border-radius: 6px;
  background: #f4f6f6;
  color: #778486;
  font-size: var(--font-size-caption);
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
  font-size: var(--font-size-body);
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
  background: #f0f1ef;
  color: #777d7c;
}

.edit-principle__remove {
  background: #fff1ef;
  color: #e06d63;
}

.available-principles article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 32px;
  align-items: center;
  gap: 8px;
  padding: 11px;
  border-bottom: 1px solid #edf0f0;
}

.available-principles button {
  background: #e9f8f7;
  color: #0a918c;
}

.custom-principle {
  border: 1px solid #dce5e5;
  border-radius: 11px;
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
</style>
