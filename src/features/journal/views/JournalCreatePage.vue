<script setup>
import { BookCheck, CalendarCheck, Info } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import JournalMoodPanel from '@/features/journal/components/JournalMoodPanel.vue'
import JournalTradeTimeline from '@/features/journal/components/JournalTradeTimeline.vue'
import { getDefaultJournalDate } from '@/features/journal/api/journalApi'
import { useJournalStore } from '@/features/journal/stores/journalStore'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'
import BaseTextarea from '@/shared/components/inputs/BaseTextarea.vue'
import AppBar from '@/shared/components/navigation/AppBar.vue'

const AUTO_SAVE_DELAY = 500
const DRAFT_KEY_PREFIX = 'investory:journal-draft:'

const route = useRoute()
const router = useRouter()
const journalStore = useJournalStore()

const form = reactive({
  marketMood: 'CALM',
  marketThought: '',
  tradeNotes: {},
})
const sortOrder = ref('latest')
const autoSaveStatus = ref('작성 내용을 불러오는 중…')
const validationMessage = ref('')
const resultMessage = ref('')
const isHydrating = ref(true)
let autoSaveTimer

const journalDate = computed(() => String(route.query.date || getDefaultJournalDate()))
const draftStorageKey = computed(() => `${DRAFT_KEY_PREFIX}${journalDate.value}`)
const isEditMode = computed(() => Boolean(journalStore.dailyEntry?.journal))
const canSubmit = computed(
  () => Boolean(form.marketMood) && form.marketThought.trim().length > 0 && !journalStore.loading,
)
const dateLabel = computed(() => {
  const date = route.query.date ? new Date(`${route.query.date}T00:00:00`) : new Date()
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'long' }).format(date)
  return `${date.getMonth() + 1}월 ${date.getDate()}일, ${weekday}`
})
const monthLabel = computed(() => {
  const date = route.query.date ? new Date(`${route.query.date}T00:00:00`) : new Date()
  return new Intl.DateTimeFormat('ko-KR', { month: '2-digit' })
    .format(date)
    .replace(/\D/g, '')
})
const sortedTrades = computed(() => {
  const trades = [...(journalStore.dailyEntry?.trades ?? [])]
  return trades.sort((a, b) => {
    const direction = sortOrder.value === 'latest' ? -1 : 1
    return (new Date(a.tradedAt) - new Date(b.tradedAt)) * direction
  })
})

function applyEntry(entry) {
  const savedJournal = entry?.journal
  form.marketMood = savedJournal?.marketMood || 'CALM'
  form.marketThought = savedJournal?.marketThought || ''
  form.tradeNotes = Object.fromEntries(
    (entry?.trades ?? []).map((trade) => [trade.tradeId, trade.note?.rationaleText || '']),
  )
}

function restoreDraft() {
  if (isEditMode.value) {
    return
  }

  try {
    const savedDraft = localStorage.getItem(draftStorageKey.value)
    if (!savedDraft) {
      return
    }

    const draft = JSON.parse(savedDraft)
    form.marketMood = draft.marketMood || form.marketMood
    form.marketThought = draft.marketThought || ''
    form.tradeNotes = { ...form.tradeNotes, ...(draft.tradeNotes || {}) }
  } catch {
    autoSaveStatus.value = '임시 저장 내용을 불러오지 못했어요'
  }
}

function saveDraft() {
  if (isHydrating.value || isEditMode.value) {
    return
  }

  autoSaveStatus.value = '자동 저장 중…'

  try {
    localStorage.setItem(
      draftStorageKey.value,
      JSON.stringify({
        marketMood: form.marketMood,
        marketThought: form.marketThought,
        tradeNotes: form.tradeNotes,
      }),
    )
    autoSaveStatus.value = '마지막 자동 저장 · 방금 전'
  } catch {
    autoSaveStatus.value = '자동 저장에 실패했어요'
  }
}

function scheduleAutoSave() {
  if (isHydrating.value || isEditMode.value) {
    return
  }

  window.clearTimeout(autoSaveTimer)
  autoSaveTimer = window.setTimeout(saveDraft, AUTO_SAVE_DELAY)
}

function handleBack() {
  router.push({ name: ROUTE_NAMES.JOURNAL })
}

function updateTradeNote({ tradeId, value }) {
  form.tradeNotes[tradeId] = value
}

function toggleSort() {
  sortOrder.value = sortOrder.value === 'latest' ? 'oldest' : 'latest'
}

async function handleSubmit() {
  validationMessage.value = ''
  resultMessage.value = ''

  if (!form.marketMood || !form.marketThought.trim()) {
    validationMessage.value = '판단 온도와 오늘 시장에 대한 생각을 모두 입력해 주세요.'
    return
  }

  const tradeNotes = Object.entries(form.tradeNotes)
    .filter(([, rationaleText]) => rationaleText.trim())
    .map(([tradeId, rationaleText]) => ({
      tradeId: Number(tradeId),
      rationaleText: rationaleText.trim(),
    }))

  try {
    await journalStore.saveDailyJournal({
      journalDate: journalDate.value,
      marketMood: form.marketMood,
      marketThought: form.marketThought.trim(),
      tradeNotes,
    })
    localStorage.removeItem(draftStorageKey.value)
    applyEntry(journalStore.dailyEntry)
    resultMessage.value = isEditMode.value
      ? '오늘의 투자 일기를 저장했어요. 이어서 수정할 수 있습니다.'
      : '오늘의 투자 일기를 저장했어요.'
    autoSaveStatus.value = '저장 완료 · 방금 전'
  } catch (err) {
    resultMessage.value = err?.message || journalStore.error || '일기를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.'
  }
}

watch(
  () => [form.marketMood, form.marketThought, JSON.stringify(form.tradeNotes)],
  scheduleAutoSave,
)

onMounted(async () => {
  try {
    await journalStore.fetchDailyEntry(journalDate.value)
    applyEntry(journalStore.dailyEntry)
    restoreDraft()
    autoSaveStatus.value = isEditMode.value
      ? '저장된 일기를 불러왔어요'
      : '작성하면 자동으로 임시 저장돼요'
  } catch {
    autoSaveStatus.value = '일기 정보를 불러오지 못했어요'
  } finally {
    isHydrating.value = false
  }
})

onBeforeUnmount(() => window.clearTimeout(autoSaveTimer))
</script>

<template>
  <div class="journal-create-page">
    <AppBar title="오늘의 투자 일기" :show-close="false" @back="handleBack" />

    <div
      v-if="journalStore.loading && !journalStore.dailyEntry"
      class="journal-create-page__loading"
    >
      <BaseLoading />
    </div>

    <template v-else>
      <main class="journal-create-page__content">
        <section class="journal-create-page__date">
          <div>
            <p class="journal-create-page__eyebrow">DAILY NOTE · {{ monthLabel }}</p>
            <h2>{{ dateLabel }}</h2>
          </div>
          <span class="journal-create-page__badge">
            <CalendarCheck :size="13" :stroke-width="1.8" aria-hidden="true" />
            오늘 1회
          </span>
        </section>

        <section class="journal-create-page__reflection" aria-label="판단 온도와 시장 생각">
          <JournalMoodPanel v-model="form.marketMood" />
          <BaseTextarea
            v-model="form.marketThought"
            label="오늘 시장을 보며 든 생각"
            :required="true"
            placeholder="오늘 시장을 어떻게 바라봤는지, 어떤 감정을 느꼈는지, 투자 원칙을 지켰는지 자유롭게 적어주세요."
            :max-length="500"
          />
        </section>

        <p
          v-if="validationMessage"
          class="journal-create-page__message journal-create-page__message--error"
        >
          {{ validationMessage }}
        </p>

        <JournalTradeTimeline
          :trades="sortedTrades"
          :notes="form.tradeNotes"
          :sort-order="sortOrder"
          @update-note="updateTradeNote"
          @toggle-sort="toggleSort"
        />

        <div class="journal-create-page__notice">
          <Info :size="14" :stroke-width="1.8" aria-hidden="true" />
          <p>
            오늘은 한 번만 저장돼요.<br />
            저장 후에는 이 일기를 이어서 수정할 수 있어요.
          </p>
        </div>

        <p
          v-if="resultMessage"
          class="journal-create-page__message"
          :class="{ 'journal-create-page__message--error': journalStore.error }"
          role="status"
        >
          {{ resultMessage }}
        </p>
      </main>

      <footer class="journal-create-page__save">
        <BaseButton full-width :disabled="!canSubmit" @click="handleSubmit">
          <template #iconLeft>
            <BookCheck :size="17" :stroke-width="1.8" aria-hidden="true" />
          </template>
          {{ isEditMode ? '오늘의 투자 일기 수정' : '오늘의 투자 일기 저장' }}
        </BaseButton>
        <span class="journal-create-page__auto-save" role="status">{{ autoSaveStatus }}</span>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.journal-create-page {
  min-height: 100%;
  background: #ffffff;
}

.journal-create-page :deep(.app-bar) {
  position: sticky;
  top: 0;
  z-index: 20;
}

.journal-create-page__loading {
  display: grid;
  min-height: 520px;
  place-items: center;
}

.journal-create-page__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 20px 10px;
}

.journal-create-page__date {
  display: flex;
  min-height: 56px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e7eb;
}

.journal-create-page__eyebrow {
  margin: 0 0 2px;
  color: var(--brand-teal-deep);
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 600;
  letter-spacing: 1.2px;
}

.journal-create-page__date h2 {
  margin: 0;
  color: var(--text-primary);
  font-family: var(--font-heading);
  font-size: var(--font-size-title-md);
  font-weight: 700;
  line-height: 1.25;
}

.journal-create-page__badge {
  display: inline-flex;
  height: 28px;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  border-radius: 14px;
  background: #c8f3ee;
  color: var(--teal-deep);
  font-size: var(--font-size-caption);
  font-weight: 700;
  white-space: nowrap;
}

.journal-create-page__reflection {
  display: flex;
  min-height: 220px;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e4e9ea;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.journal-create-page__reflection :deep(.base-textarea) {
  min-width: 0;
  flex: 1 1 0;
}

.journal-create-page__reflection :deep(.base-textarea__field-wrapper) {
  padding: 11px 12px;
}

.journal-create-page__reflection :deep(.base-textarea__field) {
  min-height: 152px;
  resize: none;
}

.journal-create-page__notice {
  display: flex;
  min-height: 38px;
  align-items: center;
  gap: 7px;
  padding: 0 2px;
  color: var(--text-tertiary);
}

.journal-create-page__notice p {
  margin: 0;
  font-size: var(--font-size-caption);
  line-height: 1.4;
}

.journal-create-page__message {
  margin: 0;
  padding: 9px 11px;
  border-radius: 9px;
  background: var(--brand-teal-soft);
  color: var(--teal-deep);
  font-size: var(--font-size-caption);
  line-height: 1.4;
}

.journal-create-page__message--error {
  background: var(--brand-red-soft);
  color: var(--brand-red);
}

.journal-create-page__save {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 20px 12px;
  border-top: 1px solid var(--border-subtle);
  background: #ffffff;
}

.journal-create-page__save :deep(.base-button--primary) {
  background: var(--teal-deep);
  box-shadow: 0 3px 8px rgba(7, 95, 90, 0.14);
}

.journal-create-page__auto-save {
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  line-height: 1.4;
  text-align: center;
}

@media (max-width: 360px) {
  .journal-create-page__content {
    padding-right: 14px;
    padding-left: 14px;
  }

  .journal-create-page__reflection {
    gap: 8px;
    padding: 10px;
  }

  .journal-create-page__date h2 {
    font-size: var(--font-size-title-md);
  }
}
</style>
