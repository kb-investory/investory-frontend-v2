<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import { getDefaultJournalDate } from '@/features/journal/api/journalApi'
import JournalDayDigest from '@/features/journal/components/JournalDayDigest.vue'
import { useJournalStore } from '@/features/journal/stores/journalStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import PrimaryTabHeader from '@/shared/components/navigation/PrimaryTabHeader.vue'

const router = useRouter()
const journalStore = useJournalStore()

const todayDate = getDefaultJournalDate()
const [todayYear, todayMonth] = todayDate.split('-').map(Number)
const selectedDate = ref(todayDate)
const currentYear = ref(todayYear)
const currentMonth = ref(todayMonth)
const isWeekView = ref(false)
const hasSelectedDate = ref(false)
const isDailyLoading = ref(false)
const dailyLoadError = ref('')
const swipeStart = ref(null)
let dailyLoadRequestId = 0

const monthLabel = computed(() => `${currentYear.value}년 ${currentMonth.value}월`)

const journalByDate = computed(
  () =>
    new Map(
      journalStore.entries.map((entry) => [entry.journalDate ?? entry.journal?.journalDate, entry]),
    ),
)
const activityByDate = computed(
  () =>
    new Map(journalStore.calendarActivities.map((activity) => [activity.activityDate, activity])),
)

const calendarCells = computed(() => {
  const firstDay = new Date(currentYear.value, currentMonth.value - 1, 1)
  const gridStart = new Date(currentYear.value, currentMonth.value - 1, 1 - firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    const dateKey = formatDateKey(date)
    const journal = journalByDate.value.get(dateKey)
    const activity = activityByDate.value.get(dateKey)
    const tradeCount = Number(journal?.tradeCount ?? activity?.tradeCount ?? 0)

    return {
      date,
      dateKey,
      day: date.getDate(),
      inCurrentMonth: date.getMonth() + 1 === currentMonth.value,
      isSelected: dateKey === selectedDate.value,
      isToday: dateKey === todayDate,
      journal,
      tradeCount,
    }
  })
})

const weekCells = computed(() => {
  const selected = new Date(`${selectedDate.value}T00:00:00`)
  const weekStart = new Date(selected)
  weekStart.setDate(selected.getDate() - selected.getDay())

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    const dateKey = formatDateKey(date)
    const journal = journalByDate.value.get(dateKey)
    const activity = activityByDate.value.get(dateKey)

    return {
      date,
      dateKey,
      day: date.getDate(),
      inCurrentMonth: date.getMonth() + 1 === currentMonth.value,
      isSelected: dateKey === selectedDate.value,
      isToday: dateKey === todayDate,
      journal,
      tradeCount: Number(journal?.tradeCount ?? activity?.tradeCount ?? 0),
    }
  })
})

const displayedCalendarCells = computed(() =>
  isWeekView.value ? weekCells.value : calendarCells.value,
)

const selectedDateLabel = computed(() => {
  const date = new Date(`${selectedDate.value}T00:00:00`)
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'long' }).format(date)
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${weekday}`
})

const selectedDailyEntry = computed(() => {
  if (journalStore.dailyEntry?.journalDate !== selectedDate.value) return null
  return journalStore.dailyEntry
})

const selectedJournalTime = computed(() => {
  const journal = selectedDailyEntry.value?.journal
  const value = journal?.createdAt ?? journal?.updatedAt
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
})

onMounted(() => journalStore.fetchMonthlyCalendar(currentYear.value, currentMonth.value))

watch(isWeekView, (showWeek) => {
  if (showWeek) loadSelectedDate(selectedDate.value)
})

async function loadSelectedDate(dateKey = selectedDate.value) {
  const requestId = ++dailyLoadRequestId
  const summaryEntry = journalByDate.value.get(dateKey)
  const activity = activityByDate.value.get(dateKey)
  const summaryJournal = summaryEntry?.journal ?? summaryEntry
  const hasSummaryJournal = Boolean(summaryJournal?.journalId ?? summaryJournal?.marketMood)

  if (hasSummaryJournal) {
    journalStore.dailyEntry = {
      journalDate: dateKey,
      canCreate: false,
      journal: summaryJournal,
      trades: summaryEntry?.trades?.length ? summaryEntry.trades : (activity?.trades ?? []),
    }
  } else {
    journalStore.dailyEntry = null
  }

  // 월 목록에 작성된 일지가 있으면 먼저 즉시 표시하고 상세 데이터만 뒤에서 갱신한다.
  isDailyLoading.value = !hasSummaryJournal
  dailyLoadError.value = ''

  try {
    await journalStore.fetchDailyEntry(dateKey, { preferCalendarTrades: true })
  } catch {
    if (requestId === dailyLoadRequestId && !hasSummaryJournal) {
      dailyLoadError.value = '선택한 날짜의 기록을 불러오지 못했어요.'
    }
  } finally {
    if (requestId === dailyLoadRequestId) {
      isDailyLoading.value = false
    }
  }
}

function formatDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function openStocks() {
  router.push({ name: ROUTE_NAMES.JOURNAL_SEARCH })
}

async function selectCalendarDate(cell) {
  selectedDate.value = cell.dateKey
  hasSelectedDate.value = true

  if (!cell.inCurrentMonth) {
    currentYear.value = cell.date.getFullYear()
    currentMonth.value = cell.date.getMonth() + 1
    await journalStore.fetchMonthlyCalendar(currentYear.value, currentMonth.value)
  }

  await loadSelectedDate(cell.dateKey)
}

function onSwipeStart(event) {
  const point = event.touches?.[0]
  if (!point) return
  swipeStart.value = { x: point.clientX, y: point.clientY }
}

function onSwipeEnd(event) {
  const point = event.changedTouches?.[0]
  const start = swipeStart.value
  swipeStart.value = null
  if (!point || !start) return

  const deltaX = point.clientX - start.x
  const deltaY = point.clientY - start.y
  if (Math.abs(deltaY) < 44 || Math.abs(deltaY) <= Math.abs(deltaX)) return

  isWeekView.value = deltaY < 0
}

async function moveMonth(offset) {
  const nextMonth = new Date(currentYear.value, currentMonth.value - 1 + offset, 1)
  currentYear.value = nextMonth.getFullYear()
  currentMonth.value = nextMonth.getMonth() + 1
  selectedDate.value = formatDateKey(nextMonth)
  await journalStore.fetchMonthlyCalendar(currentYear.value, currentMonth.value)
}

function writeSelectedJournal() {
  router.push({
    name: ROUTE_NAMES.JOURNAL_CREATE,
    query: { date: selectedDate.value, from: 'journal' },
  })
}
</script>

<template>
  <div class="journal-calendar-page">
    <PrimaryTabHeader title="투자 일지" flat-bottom>
      <template #right>
        <button
          class="journal-calendar-page__stocks"
          type="button"
          aria-label="내 종목별 투자 일지 보기"
          @click="openStocks"
        >
          <AppIcon name="briefcase-business" :size="20" />
        </button>
      </template>
    </PrimaryTabHeader>

    <nav class="journal-month-bridge" aria-label="투자 일지 월 이동">
      <button type="button" aria-label="이전 달" @click="moveMonth(-1)">
        <AppIcon name="chevron-left" :size="20" />
      </button>
      <div>
        <strong>{{ monthLabel }}</strong>
      </div>
      <button type="button" aria-label="다음 달" @click="moveMonth(1)">
        <AppIcon name="chevron-right" :size="20" />
      </button>
    </nav>

    <main class="journal-calendar-page__content">
      <section
        class="journal-month-card"
        :class="{ 'journal-month-card--week': isWeekView }"
        :aria-label="isWeekView ? '주간 투자 일지 달력' : '월간 투자 일지 달력'"
        @touchstart.passive="onSwipeStart"
        @touchend.passive="onSwipeEnd"
      >
        <div class="journal-month-card__weekdays" aria-hidden="true">
          <span>일</span>
          <span>월</span>
          <span>화</span>
          <span>수</span>
          <span>목</span>
          <span>금</span>
          <span>토</span>
        </div>

        <div class="journal-month-card__grid" role="grid" :aria-label="monthLabel">
          <button
            v-for="(cell, index) in displayedCalendarCells"
            :key="cell.dateKey"
            type="button"
            role="gridcell"
            class="journal-month-card__day"
            :class="{
              'journal-month-card__day--outside': !cell.inCurrentMonth,
              'journal-month-card__day--selected': cell.isSelected,
              'journal-month-card__day--today': cell.isToday,
              'journal-month-card__day--sunday': index % 7 === 0,
              'journal-month-card__day--saturday': index % 7 === 6,
            }"
            :aria-label="`${cell.dateKey}${cell.journal ? ', 투자 일지 있음' : ''}${cell.tradeCount ? `, 거래 ${cell.tradeCount}건` : ''}`"
            :aria-selected="cell.isSelected"
            @click="selectCalendarDate(cell)"
          >
            <span class="journal-month-card__number">{{ cell.day }}</span>
            <span v-if="cell.journal" class="journal-month-card__journal-mark" aria-hidden="true" />
            <span
              v-if="cell.tradeCount"
              class="journal-month-card__trade-mark"
              aria-hidden="true"
            />
          </button>
        </div>

        <button
          type="button"
          class="journal-month-card__handle"
          :aria-expanded="isWeekView"
          :aria-label="isWeekView ? '월간 달력로 펼치기' : '주간 달력으로 접기'"
          @click="isWeekView = !isWeekView"
        >
          <span aria-hidden="true" />
          <small>{{ isWeekView ? '아래로 밀어 월간 보기' : '위로 밀어 기록 보기' }}</small>
        </button>

        <section
          v-if="isWeekView || hasSelectedDate"
          class="journal-selected-panel"
          aria-label="선택한 날짜의 기록"
        >
          <header class="journal-selected-panel__header">
            <div>
              <strong>{{ selectedDateLabel }}</strong>
              <span v-if="selectedJournalTime">{{ selectedJournalTime }} 기록</span>
            </div>
          </header>

          <div v-if="isDailyLoading" class="journal-selected-panel__state">
            선택한 날짜의 기록을 불러오고 있어요.
          </div>

          <div v-else-if="dailyLoadError" class="journal-selected-panel__state" role="alert">
            <span>{{ dailyLoadError }}</span>
            <button type="button" @click="loadSelectedDate()">다시 시도</button>
          </div>

          <JournalDayDigest
            v-else-if="selectedDailyEntry?.journal || selectedDailyEntry?.trades?.length"
            class="journal-selected-panel__digest"
            :entry="selectedDailyEntry"
            @edit="writeSelectedJournal"
          />

          <button
            v-else
            type="button"
            class="journal-selected-panel__record"
            :class="{ 'journal-selected-panel__record--empty': true }"
            @click="writeSelectedJournal"
          >
            <span class="journal-selected-panel__empty-icon" aria-hidden="true">
              <AppIcon name="book-open" :size="21" />
            </span>
            <span>
              <strong>아직 작성한 투자 일지가 없어요</strong>
              <small>이 날짜의 판단과 근거를 남겨보세요.</small>
            </span>
            <span class="journal-selected-panel__action">
              투자 일지 작성
              <AppIcon name="chevron-right" :size="16" />
            </span>
          </button>
        </section>
      </section>
    </main>
  </div>
</template>

<style scoped>
.journal-calendar-page {
  display: flex;
  width: 100%;
  min-height: 100%;
  flex-direction: column;
  color: var(--text-primary, #181817);
  background: #f3f6f8;
}

.journal-calendar-page__content {
  position: relative;
  z-index: 4;
  margin-top: 14px;
  padding: 0 16px 104px;
}

.journal-month-bridge {
  position: relative;
  z-index: 6;
  display: grid;
  width: calc(100% - 32px);
  max-width: calc(var(--app-content-inline-size, 840px) - 32px);
  min-height: 62px;
  grid-template-columns: 46px 1fr 46px;
  align-items: center;
  margin: -31px auto 0;
  padding: 7px;
  border: 1px solid #b9e5e2;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 14px 30px rgb(23 66 77 / 13%);
}

.journal-month-bridge > button {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 17px;
  color: #087f7c;
  background: #e7f7f6;
  cursor: pointer;
  transition:
    color 160ms ease,
    background-color 160ms ease,
    transform 160ms ease;
}

.journal-month-bridge > button:hover {
  color: #ffffff;
  background: #087f7c;
  transform: translateY(-1px);
}

.journal-month-bridge > button:focus-visible {
  outline: 2px solid #087f7c;
  outline-offset: 2px;
}

.journal-month-bridge > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
}

.journal-month-bridge strong {
  color: #087f7c;
  font-size: 18px;
  font-weight: 800;
}

.journal-month-card {
  overflow: hidden;
  border: 1px solid #d9e5e7;
  border-radius: 30px;
  background: #ffffff;
  box-shadow: 0 20px 44px rgb(42 68 80 / 12%);
  touch-action: pan-y;
}

.journal-month-card__weekdays,
.journal-month-card__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.journal-month-card__weekdays {
  padding: 18px 13px 5px;
  color: #68727f;
  font-size: 11px;
  font-weight: 800;
  text-align: center;
}

.journal-month-card__weekdays span:first-child {
  color: #e74d58;
}

.journal-month-card__weekdays span:last-child {
  color: #3974d9;
}

.journal-month-card__grid {
  padding: 0 13px 8px;
}

.journal-month-card__day {
  position: relative;
  display: flex;
  min-width: 0;
  height: 50px;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 7px 2px 4px;
  overflow: hidden;
  border: 0;
  border-radius: 14px;
  color: #192330;
  background: transparent;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    color 160ms ease,
    height 220ms ease;
}

.journal-month-card__day:hover {
  background: #eff9f8;
}

.journal-month-card__day:focus-visible,
.journal-month-card__handle:focus-visible,
.journal-selected-panel button:focus-visible {
  outline: 2px solid #087f7c;
  outline-offset: -2px;
}

.journal-month-card__number {
  display: grid;
  width: 27px;
  height: 27px;
  flex: 0 0 27px;
  place-items: center;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
}

.journal-month-card__day--sunday {
  color: #e74d58;
}

.journal-month-card__day--saturday {
  color: #3974d9;
}

.journal-month-card__day--outside {
  color: #c8cdd2;
}

.journal-month-card__day--selected .journal-month-card__number {
  color: #ffffff;
  background: #263a43;
  box-shadow: 0 5px 12px rgb(38 58 67 / 22%);
}

.journal-month-card__day--today:not(.journal-month-card__day--selected)
  .journal-month-card__number {
  color: #087f7c;
  background: #e2f6f4;
}

.journal-month-card__journal-mark,
.journal-month-card__trade-mark {
  position: absolute;
  bottom: 4px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.journal-month-card__journal-mark {
  left: calc(50% - 6px);
  background: #35c8a1;
}

.journal-month-card__trade-mark {
  right: calc(50% - 6px);
  background: #e99a2f;
}

.journal-month-card--week .journal-month-card__weekdays {
  padding-top: 12px;
}

.journal-month-card--week .journal-month-card__grid {
  padding-bottom: 5px;
}

.journal-month-card--week .journal-month-card__day {
  height: 54px;
}

.journal-month-card__handle {
  display: flex;
  width: 100%;
  min-height: 34px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 5px;
  border: 0;
  color: #7b8790;
  background: #ffffff;
  cursor: pointer;
}

.journal-month-card__handle > span {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: #c7cdcf;
}

.journal-month-card__handle small {
  font-size: 8px;
  font-weight: 700;
}

.journal-selected-panel {
  padding: 12px 14px 15px;
  background: #ffffff;
}

.journal-selected-panel__state {
  display: flex;
  min-height: 90px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  color: #74808a;
  font-size: 11px;
  font-weight: 700;
}

.journal-selected-panel__state button {
  padding: 7px 10px;
  border: 0;
  border-radius: 10px;
  color: #ffffff;
  background: #087f7c;
}

.journal-selected-panel__digest {
  margin-top: 10px;
}

.journal-selected-panel__header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-inline: 12px;
}

.journal-selected-panel__header > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  text-align: left;
}

.journal-selected-panel__header strong {
  color: #15232c;
  font-size: 14px;
  font-weight: 900;
}

.journal-selected-panel__header span {
  color: #8a939b;
  font-size: 9px;
  font-weight: 700;
}

.journal-selected-panel__record {
  display: flex;
  width: 100%;
  min-height: 94px;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  margin-top: 9px;
  padding: 14px 16px;
  border: 0;
  border-radius: 20px;
  color: #ffffff;
  text-align: left;
  background: linear-gradient(135deg, #075863, #087f7c);
  cursor: pointer;
}

.journal-selected-panel__record > strong {
  display: -webkit-box;
  overflow: hidden;
  font-size: 13px;
  font-weight: 850;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.journal-selected-panel__record > span:last-child {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: auto;
  color: #d3efed;
  font-size: 9px;
  font-weight: 800;
}

.journal-selected-panel__record--empty {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  color: #253140;
  background: #f1faf9;
  border: 1px solid #cce8e6;
}

.journal-selected-panel__empty-icon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 14px;
  color: #087f7c !important;
  background: #ddf4f2;
}

.journal-selected-panel__record--empty > span:nth-child(2) {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.journal-selected-panel__record--empty strong {
  color: #253140;
  font-size: 11px;
  font-weight: 900;
}

.journal-selected-panel__record--empty small {
  color: #7c8793;
  font-size: 9px;
}

.journal-selected-panel__action {
  color: #087f7c !important;
  white-space: nowrap;
}

.journal-calendar-page__stocks {
  width: 44px !important;
  min-width: 44px;
  padding: 0 !important;
  border-color: rgb(67 222 217 / 34%) !important;
  border-radius: 50% !important;
  color: #ffffff !important;
  background: rgb(5 45 56 / 76%) !important;
}

.journal-calendar-page__stocks:hover {
  border-color: rgb(86 235 229 / 72%) !important;
  color: #ffffff !important;
  background: #075863 !important;
  box-shadow: 0 0 20px rgb(22 201 196 / 22%) !important;
}

.journal-calendar-page__stocks:focus-visible {
  outline: 2px solid #087f7c;
  outline-offset: 2px;
}

@media (max-width: 380px) {
  .journal-calendar-page__content {
    padding-right: 12px;
    padding-left: 12px;
  }

  .journal-month-bridge {
    width: calc(100% - 24px);
  }

  .journal-month-card__weekdays,
  .journal-month-card__grid {
    padding-right: 8px;
    padding-left: 8px;
  }

  .journal-month-card__day {
    height: 46px;
  }

  .journal-selected-panel {
    padding-right: 10px;
    padding-left: 10px;
  }
}
</style>
