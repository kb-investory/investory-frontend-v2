<script setup>
import { BookCheck, CalendarDays, CircleHelp, Info } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import { queryClient } from '@/app/providers/queryClient'
import { getJournalTradeHistory } from '@/features/journal/api/journalStockApi'
import JournalMoodPanel from '@/features/journal/components/JournalMoodPanel.vue'
import JournalTradeTimeline from '@/features/journal/components/JournalTradeTimeline.vue'
import { getDefaultJournalDate } from '@/features/journal/api/journalApi'
import { useJournalStore } from '@/features/journal/stores/journalStore'
import { queryKeys } from '@/shared/api/queryKeys'
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
const tradeHistories = reactive({})
const tradeHistoryLoading = reactive({})
const tradeHistoryErrors = reactive({})
let autoSaveTimer

const journalDate = computed(() => String(route.query.date || getDefaultJournalDate()))
const draftStorageKey = computed(() => `${DRAFT_KEY_PREFIX}${journalDate.value}`)
const isEditMode = computed(() => Boolean(journalStore.dailyEntry?.journal))
const canSubmit = computed(
  () => Boolean(form.marketMood) && form.marketThought.trim().length > 0 && !journalStore.loading,
)
const dateLabel = computed(() => {
  const date = new Date(`${journalDate.value}T00:00:00`)
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'long' }).format(date)
  return `${date.getMonth() + 1}월 ${date.getDate()}일, ${weekday}`
})
const monthLabel = computed(() => {
  const date = new Date(`${journalDate.value}T00:00:00`)
  return new Intl.DateTimeFormat('ko-KR', { month: '2-digit' }).format(date).replace(/\D/g, '')
})
const thoughtPrompts = ['가장 기억난 건', '내 판단 근거는', '다음에는']
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
  const destination = route.query.from === 'home' ? ROUTE_NAMES.HOME : ROUTE_NAMES.JOURNAL
  router.push({ name: destination })
}

function updateTradeNote({ tradeId, value }) {
  form.tradeNotes[tradeId] = value
}

function toggleSort() {
  sortOrder.value = sortOrder.value === 'latest' ? 'oldest' : 'latest'
}

async function loadTradeHistory(trade) {
  const securityId = Number(trade.securityId)
  const historyKey = String(securityId)
  if (!securityId) {
    tradeHistoryErrors[historyKey] = '종목 정보를 확인할 수 없어요.'
    return
  }
  if (Object.hasOwn(tradeHistories, historyKey) || tradeHistoryLoading[historyKey]) return

  tradeHistoryLoading[historyKey] = true
  tradeHistoryErrors[historyKey] = ''

  try {
    tradeHistories[historyKey] = await queryClient.fetchQuery({
      queryKey: queryKeys.journal.tradeHistory(securityId, journalDate.value),
      queryFn: () =>
        getJournalTradeHistory({
          securityId,
          journalDate: journalDate.value,
          size: 20,
        }),
      staleTime: 5 * 60 * 1000,
    })
  } catch (error) {
    tradeHistoryErrors[historyKey] = error?.message || '이전 거래 기록을 불러오지 못했어요.'
  } finally {
    tradeHistoryLoading[historyKey] = false
  }
}

function openStockHistory(trade) {
  if (!trade.securityCode) return

  router.push({
    name: ROUTE_NAMES.JOURNAL_STOCK,
    params: { securityCode: trade.securityCode },
  })
}

function appendThoughtPrompt(prompt) {
  const separator = form.marketThought.trim() ? '\n' : ''
  form.marketThought = `${form.marketThought}${separator}${prompt}: `
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
    await router.replace({
      name: ROUTE_NAMES.JOURNAL_DATE,
      params: { date: journalDate.value },
    })
  } catch (err) {
    resultMessage.value =
      err?.message || journalStore.error || '일기를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.'
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
          <span class="journal-create-page__date-icon" aria-hidden="true">
            <CalendarDays :size="19" :stroke-width="2" />
          </span>
          <div class="journal-create-page__date-copy">
            <p class="journal-create-page__eyebrow">DAILY NOTE · {{ monthLabel }}</p>
            <h2>{{ dateLabel }}</h2>
          </div>
          <span class="journal-create-page__badge">
            <span class="journal-create-page__today-dot" aria-hidden="true" />
            오늘 1회
          </span>
        </section>

        <section class="journal-create-page__step-card" aria-labelledby="mood-step-title">
          <header class="journal-create-page__step-header">
            <span class="journal-create-page__step-number">1</span>
            <h2 id="mood-step-title">오늘 시장을 보며 어떤 기분이었나요?</h2>
          </header>
          <JournalMoodPanel v-model="form.marketMood" />
        </section>

        <section class="journal-create-page__step-card" aria-labelledby="thought-step-title">
          <header
            class="journal-create-page__step-header journal-create-page__step-header--thought"
          >
            <span class="journal-create-page__step-number journal-create-page__step-number--dark"
              >2</span
            >
            <h2 id="thought-step-title">오늘의 생각을 한 문장부터</h2>
            <span class="journal-create-page__counter">{{ form.marketThought.length }} / 500</span>
          </header>

          <div class="journal-create-page__thought-guide">
            <CircleHelp :size="15" :stroke-width="1.8" aria-hidden="true" />
            <span>지금까지의 매매 중 첫 번째로 남는 생각은?</span>
          </div>

          <div class="journal-create-page__prompt-list" aria-label="빠른 작성 문구">
            <button
              v-for="prompt in thoughtPrompts"
              :key="prompt"
              type="button"
              @click="appendThoughtPrompt(prompt)"
            >
              {{ prompt }}
            </button>
          </div>

          <BaseTextarea
            v-model="form.marketThought"
            label="오늘 시장을 보며 든 생각"
            :required="true"
            placeholder="버튼을 눌러 시작하거나, 지금 떠오르는 생각을 편하게 적어보세요."
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
          :histories="tradeHistories"
          :history-loading="tradeHistoryLoading"
          :history-errors="tradeHistoryErrors"
          @update-note="updateTradeNote"
          @toggle-sort="toggleSort"
          @load-history="loadTradeHistory"
          @open-stock-history="openStockHistory"
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
  min-height: 66px;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #d8ecea;
  border-radius: 14px;
  background: #f1fbfa;
}

.journal-create-page__date-icon {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  background: var(--brand-teal-deep);
  color: #ffffff;
}

.journal-create-page__date-copy {
  min-width: 0;
  flex: 1;
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
  background: #ffffff;
  color: var(--teal-deep);
  font-size: var(--font-size-caption);
  font-weight: 700;
  white-space: nowrap;
}

.journal-create-page__today-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand-teal);
}

.journal-create-page__step-card {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e4e9ea;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.journal-create-page__step-header {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.journal-create-page__step-header h2 {
  min-width: 0;
  margin: 0;
  color: var(--text-primary);
  font-family: var(--font-heading);
  font-size: var(--font-size-body-sm);
  font-weight: 700;
  white-space: nowrap;
}

.journal-create-page__step-number {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  background: var(--brand-teal-deep);
  color: #ffffff;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.journal-create-page__step-number--dark {
  background: #24364a;
}

.journal-create-page__counter {
  margin-left: auto;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
}

.journal-create-page__thought-guide {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  border-radius: 9px;
  background: #eff9f8;
  color: var(--brand-teal-deep);
  font-size: var(--font-size-caption);
  line-height: 1.4;
}

.journal-create-page__prompt-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.journal-create-page__prompt-list button {
  min-width: 0;
  height: 32px;
  padding: 0 6px;
  overflow: hidden;
  border: 1px solid #dce6e9;
  border-radius: 9px;
  background: #ffffff;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--font-size-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.journal-create-page__prompt-list button:focus-visible {
  outline: 2px solid var(--brand-teal);
  outline-offset: 2px;
}

.journal-create-page__step-card :deep(.base-textarea) {
  min-width: 0;
}

.journal-create-page__step-card :deep(.base-textarea__header) {
  display: none;
}

.journal-create-page__step-card :deep(.base-textarea__field-wrapper) {
  padding: 11px 12px;
}

.journal-create-page__step-card :deep(.base-textarea__field) {
  min-height: 72px;
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

  .journal-create-page__step-card {
    gap: 12px;
    padding: 10px;
  }

  .journal-create-page__date h2 {
    font-size: var(--font-size-title-md);
  }
}
</style>
