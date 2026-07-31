<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import JournalCalendar from '@/features/journal/components/JournalCalendar.vue'
import JournalMonthNavigator from '@/features/journal/components/JournalMonthNavigator.vue'
import { useJournalStore } from '@/features/journal/stores/journalStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'

const router = useRouter()
const journalStore = useJournalStore()

const visibleYear = ref(2026)
const visibleMonth = ref(8)
const selectedDate = ref('2026-08-23')
const todayDate = '2026-08-23'

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

function openSearch() {
  router.push({ name: ROUTE_NAMES.JOURNAL_SEARCH })
}

function openJournal({ date }) {
  selectedDate.value = date
  router.push({
    name: ROUTE_NAMES.JOURNAL_DATE,
    params: { date },
  })
}

function writeTodayJournal() {
  router.push({
    name: ROUTE_NAMES.JOURNAL_CREATE,
    query: { date: todayDate },
  })
}
</script>

<template>
  <div class="journal-calendar-page">
    <main class="journal-calendar-page__content">
      <header class="journal-calendar-page__header">
        <div>
          <h1>투자 일지</h1>
          <p>밑줄이 있는 날짜를 선택해 일지를 확인하세요</p>
        </div>

        <button
          class="journal-calendar-page__search"
          type="button"
          aria-label="종목별 투자 일지 검색"
          @click="openSearch"
        >
          <AppIcon name="search" :size="20" />
        </button>
      </header>

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
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 12px;
  padding: 0 20px 10px;
}

.journal-calendar-page__header {
  display: flex;
  height: 60px;
  flex: 0 0 60px;
  align-items: center;
  justify-content: space-between;
}

.journal-calendar-page__header h1 {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.journal-calendar-page__header p {
  margin: 4px 0 0;
  color: var(--text-secondary, #666662);
  font-family: var(--font-sans);
  font-size: 12px;
  line-height: 1.4;
}

.journal-calendar-page__search {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  place-items: center;
  padding: 0;
  border: 1px solid var(--border-default, #e5e5e0);
  border-radius: 9999px;
  color: var(--slate-strong, #263a43);
  background: #ffffff;
  cursor: pointer;
}

.journal-calendar-page__search:hover {
  background: var(--brand-mist, #f5fbfb);
}

.journal-calendar-page__search:focus-visible {
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
  font-size: 12px;
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
  background: var(--teal-deep, #075f5a);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.journal-calendar-page__cta button:hover {
  background: var(--brand-teal-deep, #087f7c);
}

.journal-calendar-page__cta button:focus-visible {
  outline: 2px solid var(--brand-teal, #0b8f8b);
  outline-offset: 2px;
}
</style>
