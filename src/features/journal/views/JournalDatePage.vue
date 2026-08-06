<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import { getDefaultJournalDate } from '@/features/journal/api/journalApi'
import JournalDayDigest from '@/features/journal/components/JournalDayDigest.vue'
import JournalWeekNavigator from '@/features/journal/components/JournalWeekNavigator.vue'
import { useJournalStore } from '@/features/journal/stores/journalStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const route = useRoute()
const router = useRouter()
const journalStore = useJournalStore()

const entry = ref(null)
const isLoading = ref(true)
const loadError = ref('')
let latestLoadRequestId = 0

const selectedDate = computed(() => normalizeDateKey(String(route.params.date ?? '')))

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeDateKey(dateKey) {
  if (!DATE_PATTERN.test(dateKey)) {
    return getDefaultJournalDate()
  }

  const date = new Date(`${dateKey}T00:00:00`)
  return Number.isNaN(date.getTime()) || formatDateKey(date) !== dateKey
    ? getDefaultJournalDate()
    : dateKey
}

function getWeekRange(dateKey) {
  const startDate = new Date(`${dateKey}T00:00:00`)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)

  return {
    startDate: formatDateKey(startDate),
    endDate: formatDateKey(endDate),
  }
}

async function loadDate(dateKey) {
  const requestId = ++latestLoadRequestId

  isLoading.value = true
  loadError.value = ''
  entry.value = null

  const weekRange = getWeekRange(dateKey)

  try {
    const [dailyEntry] = await Promise.all([
      journalStore.fetchDailyEntry(dateKey),
      journalStore.fetchCalendarRange(weekRange.startDate, weekRange.endDate),
    ])

    if (requestId !== latestLoadRequestId) {
      return
    }

    entry.value = dailyEntry
  } catch {
    if (requestId !== latestLoadRequestId) {
      return
    }

    loadError.value = '선택한 날짜의 투자 일지를 불러오지 못했어요.'
  } finally {
    if (requestId === latestLoadRequestId) {
      isLoading.value = false
    }
  }
}

function openDate(dateKey) {
  router.push({
    name: ROUTE_NAMES.JOURNAL_DATE,
    params: { date: dateKey },
  })
}

function moveWeek(direction) {
  const date = new Date(`${selectedDate.value}T00:00:00`)
  date.setDate(date.getDate() + direction * 7)
  openDate(formatDateKey(date))
}

function openSearch() {
  router.push({ name: ROUTE_NAMES.JOURNAL_SEARCH })
}

function goToJournal() {
  router.push({ name: ROUTE_NAMES.JOURNAL })
}

function openEditor() {
  router.push({
    name: ROUTE_NAMES.JOURNAL_CREATE,
    query: { date: selectedDate.value },
  })
}

async function retryLoad() {
  await loadDate(selectedDate.value)
}

watch(
  () => route.params.date,
  async (rawDate) => {
    const normalizedDate = normalizeDateKey(String(rawDate ?? ''))

    if (normalizedDate !== rawDate) {
      await router.replace({
        name: ROUTE_NAMES.JOURNAL_DATE,
        params: { date: normalizedDate },
      })
      return
    }

    await loadDate(normalizedDate)
  },
  { immediate: true },
)
</script>

<template>
  <div class="journal-date-page">
    <main class="journal-date-page__content">
      <header class="journal-date-page__header">
        <button
          class="journal-date-page__back"
          type="button"
          aria-label="월간 투자 일지로 돌아가기"
          @click="goToJournal"
        >
          <AppIcon name="chevron-left" :size="20" />
        </button>

        <div class="journal-date-page__heading">
          <h1>투자 일지</h1>
          <p>선택한 주의 기록과 판단 근거를 확인하세요</p>
        </div>

        <button
          class="journal-date-page__search"
          type="button"
          aria-label="종목별 투자 일지 검색"
          @click="openSearch"
        >
          <AppIcon name="search" :size="20" />
        </button>
      </header>

      <JournalWeekNavigator
        :selected-date="selectedDate"
        :entries="journalStore.entries"
        :activities="journalStore.calendarActivities"
        @navigate="moveWeek"
        @select="openDate"
      />

      <section v-if="isLoading" class="journal-date-page__state" aria-label="불러오는 중">
        <BaseLoading />
      </section>

      <section v-else-if="loadError" class="journal-date-page__state" role="alert">
        <AppIcon name="triangle-alert" :size="22" />
        <p>{{ loadError }}</p>
        <button type="button" @click="retryLoad">다시 시도</button>
      </section>

      <JournalDayDigest v-else-if="entry?.journal" :entry="entry" @edit="openEditor" />

      <section v-else class="journal-date-page__state journal-date-page__state--empty">
        <AppIcon name="book-open" :size="24" />
        <div>
          <h2>작성된 투자 일지가 없어요</h2>
          <p>다른 날짜를 선택하거나 이 날짜의 판단을 기록해 보세요.</p>
        </div>
        <button v-if="entry?.canCreate" type="button" @click="openEditor">이 날짜 일기 쓰기</button>
      </section>
    </main>
  </div>
</template>

<style scoped>
.journal-date-page {
  min-height: 100%;
  color: var(--text-primary, #181817);
  background: #ffffff;
}

.journal-date-page__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 20px 16px;
}

.journal-date-page__header {
  display: grid;
  height: 60px;
  flex: 0 0 60px;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 6px;
}

.journal-date-page__heading {
  min-width: 0;
}

.journal-date-page__header h1 {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.5px;
  line-height: 1.2;
}

.journal-date-page__header p {
  margin: 3px 0 0;
  color: var(--text-tertiary, #94948e);
  font-family: var(--font-sans);
  font-size: 11px;
  line-height: 17px;
}

.journal-date-page__back,
.journal-date-page__search {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  padding: 0;
  color: var(--text-primary, #181817);
  background: #ffffff;
  cursor: pointer;
}

.journal-date-page__back {
  border: 0;
  border-radius: 12px;
}

.journal-date-page__search {
  border: 1px solid #dce6e9;
  border-radius: 50%;
}

.journal-date-page__back:hover,
.journal-date-page__search:hover {
  background: var(--brand-mist, #f5fbfb);
}

.journal-date-page__back:focus-visible,
.journal-date-page__search:focus-visible {
  outline: 2px solid var(--brand-teal-deep, #087f7c);
  outline-offset: 2px;
}

.journal-date-page__state {
  display: flex;
  min-height: 260px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  border: 1px solid #e4e9ea;
  border-radius: 16px;
  color: var(--text-secondary, #666662);
  background: #ffffff;
  text-align: center;
}

.journal-date-page__state p,
.journal-date-page__state h2 {
  margin: 0;
}

.journal-date-page__state h2 {
  color: var(--text-primary, #181817);
  font-family: var(--font-heading);
  font-size: 16px;
}

.journal-date-page__state p {
  margin-top: 5px;
  font-family: var(--font-sans);
  font-size: 11px;
  line-height: 17px;
}

.journal-date-page__state button {
  height: 40px;
  padding: 0 14px;
  border: 0;
  border-radius: 10px;
  color: #ffffff;
  background: var(--teal-deep, #075f5a);
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.journal-date-page__state button:hover {
  background: var(--brand-teal-deep, #087f7c);
}

.journal-date-page__state--empty {
  min-height: 230px;
  color: var(--brand-teal-deep, #087f7c);
  background: var(--brand-mist, #f5fbfb);
}

.journal-date-page__state--empty p {
  color: var(--text-secondary, #666662);
}
</style>
