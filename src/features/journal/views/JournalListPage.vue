<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import { getDefaultJournalDate } from '@/features/journal/api/journalApi'
import JournalCalendar from '@/features/journal/components/JournalCalendar.vue'
import JournalMonthNavigator from '@/features/journal/components/JournalMonthNavigator.vue'
import { useJournalStore } from '@/features/journal/stores/journalStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'
import PrimaryTabHeader from '@/shared/components/navigation/PrimaryTabHeader.vue'

const router = useRouter()
const journalStore = useJournalStore()

const todayDate = getDefaultJournalDate()
const [todayYear, todayMonth] = todayDate.split('-').map(Number)
const visibleYear = ref(todayYear)
const visibleMonth = ref(todayMonth)
const selectedDate = ref(null)

onMounted(loadMonth)

async function loadMonth() {
  await journalStore.fetchMonthlyCalendar(visibleYear.value, visibleMonth.value)
}

async function moveMonth(direction) {
  const nextMonth = new Date(visibleYear.value, visibleMonth.value - 1 + direction, 1)

  visibleYear.value = nextMonth.getFullYear()
  visibleMonth.value = nextMonth.getMonth() + 1
  selectedDate.value = null

  await loadMonth()
}

async function selectMonth({ year, month }) {
  visibleYear.value = year
  visibleMonth.value = month
  selectedDate.value = null

  await loadMonth()
}

function openStocks() {
  router.push({ name: ROUTE_NAMES.JOURNAL_SEARCH })
}

function openJournal({ date, journal }) {
  selectedDate.value = date

  if (journal) {
    router.push({
      name: ROUTE_NAMES.JOURNAL_DATE,
      params: { date },
    })
    return
  }

  router.push({
    name: ROUTE_NAMES.JOURNAL_CREATE,
    query: { date, from: 'journal' },
  })
}

function writeTodayJournal() {
  router.push({
    name: ROUTE_NAMES.JOURNAL_CREATE,
    query: { date: todayDate, from: 'journal' },
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

    <main class="journal-calendar-page__content">
      <JournalMonthNavigator
        :year="visibleYear"
        :month="visibleMonth"
        @previous="moveMonth(-1)"
        @next="moveMonth(1)"
        @select="selectMonth"
      />

      <div class="journal-calendar-page__calendar">
        <JournalCalendar
          :year="visibleYear"
          :month="visibleMonth"
          :entries="journalStore.entries"
          :activities="journalStore.calendarActivities"
          :selected-date="selectedDate"
          @select="openJournal"
        />

        <div v-if="journalStore.loading" class="journal-calendar-page__loading">
          <BaseLoading />
        </div>

        <div v-else-if="journalStore.error" class="journal-calendar-page__error" role="alert">
          <p>캘린더를 불러오지 못했어요.</p>
          <button type="button" @click="loadMonth">다시 시도</button>
        </div>
      </div>
    </main>

    <div class="journal-calendar-page__cta">
      <button type="button" @click="writeTodayJournal">
        <AppIcon name="plus" :size="18" />
        <span>오늘 일기 쓰기</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.journal-calendar-page {
  display: flex;
  width: 100%;
  min-height: 100%;
  flex-direction: column;
  color: var(--text-primary, #181817);
  background: #ffffff;
}

.journal-calendar-page__content {
  position: relative;
  z-index: 4;
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 12px;
  margin-top: -24px;
  padding: 0 20px 10px;
}

.journal-calendar-page__stocks {
  width: 44px !important;
  min-width: 44px;
  border-radius: 50% !important;
  padding: 0 !important;
  border-color: rgb(67 222 217 / 34%) !important;
  background: rgb(5 45 56 / 76%) !important;
  color: #ffffff !important;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.journal-calendar-page__stocks:hover {
  border-color: rgb(86 235 229 / 72%) !important;
  background: #075863 !important;
  color: #ffffff !important;
  box-shadow: 0 0 20px rgb(22 201 196 / 22%) !important;
}

.journal-calendar-page__stocks:focus-visible {
  outline: 2px solid var(--brand-teal-deep, #087f7c);
  outline-offset: 2px;
}

.journal-calendar-page__calendar {
  position: relative;
}

.journal-calendar-page__loading,
.journal-calendar-page__error {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border: 1px solid #e4e9ea;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
}

.journal-calendar-page__error {
  align-content: center;
  gap: 8px;
  color: var(--text-secondary, #666662);
  font-size: var(--font-size-caption);
  text-align: center;
}

.journal-calendar-page__error p {
  margin: 0;
}

.journal-calendar-page__error button {
  padding: 6px 10px;
  border: 0;
  border-radius: 8px;
  color: #ffffff;
  background: var(--teal-deep, #075f5a);
  cursor: pointer;
}

.journal-calendar-page__cta {
  display: flex;
  height: 64px;
  flex: 0 0 64px;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 6px 20px 10px;
  background: #ffffff;
}

.journal-calendar-page__cta button {
  display: flex;
  width: 176px;
  height: 48px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border: 0;
  border-radius: 12px;
  color: #ffffff;
  background: linear-gradient(135deg, #053b46 0%, #087f7c 100%);
  font-family: var(--font-sans);
  font-size: var(--font-size-body);
  font-weight: 700;
  box-shadow: 0 8px 18px rgb(5 75 82 / 22%);
  cursor: pointer;
}

.journal-calendar-page__cta button:hover {
  background: linear-gradient(135deg, #064752 0%, #0b918c 100%);
}

.journal-calendar-page__cta button:focus-visible {
  outline: 2px solid var(--brand-teal, #0b8f8b);
  outline-offset: 2px;
}
</style>
