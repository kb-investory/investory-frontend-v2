<script setup>
import { computed } from 'vue'

import AppIcon from '@/shared/components/AppIcon.vue'

const props = defineProps({
  selectedDate: {
    type: String,
    required: true,
  },
  entries: {
    type: Array,
    default: () => [],
  },
  activities: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['navigate', 'select'])

const weekDayLabels = ['일', '월', '화', '수', '목', '금', '토']

function parseDate(dateKey) {
  return new Date(`${dateKey}T00:00:00`)
}

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const selectedDateObject = computed(() => parseDate(props.selectedDate))
const entryDates = computed(() => new Set(props.entries.map((entry) => entry.journalDate)))
const activityDates = computed(
  () => new Set(props.activities.map((activity) => activity.activityDate)),
)

const currentWeek = computed(() => {
  const start = new Date(selectedDateObject.value)
  start.setDate(start.getDate() - start.getDay())

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const dateKey = formatDateKey(date)

    return {
      dateKey,
      day: date.getDate(),
      dayOfWeek: date.getDay(),
      hasJournal: entryDates.value.has(dateKey),
      hasActivity: activityDates.value.has(dateKey),
    }
  })
})

const periodLabel = computed(() => {
  const date = selectedDateObject.value
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  const weekNumber = Math.ceil((date.getDate() + firstDay) / 7)

  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 · ${weekNumber}주차`
})

function getDateAriaLabel(day) {
  const [year, month, date] = day.dateKey.split('-').map(Number)
  const status = [
    day.hasJournal ? '작성한 투자 일지 있음' : '작성한 투자 일지 없음',
    day.hasActivity ? '거래 있음' : null,
  ]
    .filter(Boolean)
    .join(', ')

  return `${year}년 ${month}월 ${date}일, ${status}`
}
</script>

<template>
  <section class="week-navigator" aria-label="선택 날짜 주간 캘린더">
    <div class="week-navigator__controls">
      <button type="button" aria-label="이전 주 보기" @click="emit('navigate', -1)">
        <AppIcon name="chevron-left" :size="20" />
      </button>

      <strong aria-live="polite">{{ periodLabel }}</strong>

      <button type="button" aria-label="다음 주 보기" @click="emit('navigate', 1)">
        <AppIcon name="chevron-right" :size="20" />
      </button>
    </div>

    <div class="week-navigator__calendar">
      <div class="week-navigator__weekdays" aria-hidden="true">
        <span v-for="weekDay in weekDayLabels" :key="weekDay">{{ weekDay }}</span>
      </div>

      <div class="week-navigator__days">
        <button
          v-for="day in currentWeek"
          :key="day.dateKey"
          class="week-navigator__day"
          :class="{
            'week-navigator__day--selected': day.dateKey === selectedDate,
            'week-navigator__day--sunday': day.dayOfWeek === 0,
            'week-navigator__day--saturday': day.dayOfWeek === 6,
          }"
          type="button"
          :aria-label="getDateAriaLabel(day)"
          :aria-pressed="day.dateKey === selectedDate"
          @click="emit('select', day.dateKey)"
        >
          <span>{{ day.day }}</span>
          <span class="week-navigator__markers" aria-hidden="true">
            <span v-if="day.hasJournal" class="week-navigator__journal-mark" />
            <span v-if="day.hasActivity" class="week-navigator__activity-mark" />
          </span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.week-navigator {
  display: grid;
  gap: 12px;
}

.week-navigator__controls {
  display: grid;
  width: 100%;
  height: 48px;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  padding: 0 6px;
  border-radius: 12px;
  color: #ffffff;
  background: var(--teal-deep, #075f5a);
}

.week-navigator__controls button {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 10px;
  color: inherit;
  background: rgba(255, 255, 255, 0.07);
  cursor: pointer;
}

.week-navigator__controls button:hover {
  background: rgba(255, 255, 255, 0.14);
}

.week-navigator__controls button:focus-visible,
.week-navigator__day:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: -3px;
}

.week-navigator__controls strong {
  min-width: 0;
  overflow: hidden;
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 700;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.week-navigator__calendar {
  height: 88px;
  padding: 8px;
  border: 1px solid #e4e9ea;
  border-radius: 12px;
  background: #ffffff;
}

.week-navigator__weekdays,
.week-navigator__days {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.week-navigator__weekdays {
  height: 28px;
  align-items: center;
  border-radius: 8px;
  color: var(--slate-primary, #384f59);
  background: #f7f8fa;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  text-align: center;
}

.week-navigator__day {
  display: flex;
  height: 44px;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  color: var(--text-primary, #181817);
  background: transparent;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.week-navigator__day:hover:not(.week-navigator__day--selected) {
  background: var(--brand-mist, #f5fbfb);
}

.week-navigator__day--selected {
  background: #c8f3ee;
}

.week-navigator__day--sunday {
  color: #e34b4b;
}

.week-navigator__day--saturday {
  color: #3976d9;
}

.week-navigator__markers {
  display: flex;
  min-height: 5px;
  align-items: center;
  gap: 3px;
}

.week-navigator__journal-mark {
  width: 10px;
  height: 2px;
  border-radius: 9999px;
  background: var(--brand-teal-deep, #087f7c);
}

.week-navigator__activity-mark {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #e58b2d;
}
</style>
