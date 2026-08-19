<script setup>
import { computed } from 'vue'

const props = defineProps({
  year: {
    type: Number,
    required: true,
  },
  month: {
    type: Number,
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
  selectedDate: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['select'])

const weekDays = ['일', '월', '화', '수', '목', '금', '토']

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const todayDateKey = formatDateKey(new Date())

const entryByDate = computed(
  () => new Map(props.entries.map((entry) => [entry.journalDate, entry])),
)

const activityByDate = computed(
  () => new Map(props.activities.map((activity) => [activity.activityDate, activity])),
)

const calendarCells = computed(() => {
  const firstDay = new Date(props.year, props.month - 1, 1)
  const gridStart = new Date(props.year, props.month - 1, 1 - firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)

    const dateKey = formatDateKey(date)
    const journal = entryByDate.value.get(dateKey) || null
    const activity = activityByDate.value.get(dateKey) || null

    return {
      dateKey,
      day: date.getDate(),
      dayOfWeek: date.getDay(),
      inCurrentMonth: date.getMonth() === props.month - 1,
      isToday: dateKey === todayDateKey,
      journal,
      activity,
    }
  })
})

function selectDate(cell) {
  if (!cell.journal) {
    return
  }

  emit('select', { date: cell.dateKey, journal: cell.journal })
}

function getAriaLabel(cell) {
  const [year, month, day] = cell.dateKey.split('-').map(Number)
  const journalStatus = cell.journal ? '작성한 투자 일지 있음' : '작성한 투자 일지 없음'
  const tradeStatus = cell.activity ? `, 거래 ${cell.activity.tradeCount}건` : ''
  const todayStatus = cell.isToday ? ', 오늘' : ''
  return `${year}년 ${month}월 ${day}일${todayStatus}, ${journalStatus}${tradeStatus}`
}
</script>

<template>
  <section class="journal-calendar" aria-label="월간 투자 일지 캘린더">
    <div class="journal-calendar__weekdays" aria-hidden="true">
      <span
        v-for="(weekDay, index) in weekDays"
        :key="weekDay"
        :class="{
          'journal-calendar__weekday--sunday': index === 0,
          'journal-calendar__weekday--saturday': index === 6,
        }"
      >
        {{ weekDay }}
      </span>
    </div>

    <div class="journal-calendar__grid">
      <button
        v-for="cell in calendarCells"
        :key="cell.dateKey"
        class="journal-calendar__day"
        :class="{
          'journal-calendar__day--outside': !cell.inCurrentMonth,
          'journal-calendar__day--sunday': cell.dayOfWeek === 0,
          'journal-calendar__day--saturday': cell.dayOfWeek === 6,
          'journal-calendar__day--today': cell.isToday,
          'journal-calendar__day--selected': cell.dateKey === selectedDate,
          'journal-calendar__day--has-journal': cell.journal,
          'journal-calendar__day--has-activity': cell.activity,
        }"
        type="button"
        :aria-label="getAriaLabel(cell)"
        :aria-pressed="cell.dateKey === selectedDate"
        :disabled="!cell.journal"
        @click="selectDate(cell)"
      >
        <span class="journal-calendar__date">{{ cell.day }}</span>
        <span class="journal-calendar__markers" aria-hidden="true">
          <span v-if="cell.journal" class="journal-calendar__mark" />
          <span v-if="cell.activity" class="journal-calendar__activity-mark" />
        </span>
      </button>
    </div>

    <div class="journal-calendar__legend">
      <span>밑줄</span>
      <span class="journal-calendar__legend-mark" aria-hidden="true" />
      <span>일지 작성됨</span>
      <span class="journal-calendar__legend-dot" aria-hidden="true" />
      <span>거래 있음</span>
    </div>
  </section>
</template>

<style scoped>
.journal-calendar {
  width: 100%;
  height: 426px;
  padding: 8px;
  border: 1px solid #e4e9ea;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 4px 14px rgba(38, 58, 67, 0.07);
}

.journal-calendar__weekdays {
  display: grid;
  height: 30px;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  align-items: center;
  border-radius: 8px;
  color: var(--text-secondary, #666662);
  background: #f7f8fa;
  font-family: var(--font-sans);
  font-size: var(--font-size-caption);
  font-weight: 600;
  text-align: center;
}

.journal-calendar__weekday--sunday {
  color: #e34b4b;
}

.journal-calendar__weekday--saturday {
  color: #3976d9;
}

.journal-calendar__grid {
  display: grid;
  height: 348px;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-template-rows: repeat(6, 58px);
}

.journal-calendar__day {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 12px 0 0 8px;
  border: 0;
  border-radius: 8px;
  color: var(--text-primary, #181817);
  background: transparent;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 600;
  cursor: default;
}

.journal-calendar__day--has-journal {
  cursor: pointer;
}

.journal-calendar__day--has-journal:hover:not(.journal-calendar__day--selected):not(
    .journal-calendar__day--today
  ) {
  background: #f1fbfa;
}

.journal-calendar__day:focus-visible {
  outline: 2px solid var(--brand-teal-deep, #087f7c);
  outline-offset: -2px;
}

.journal-calendar__day--sunday {
  color: #e34b4b;
}

.journal-calendar__day--saturday {
  color: #3976d9;
}

.journal-calendar__day--outside {
  color: #e5e5e0;
}

.journal-calendar__day--outside.journal-calendar__day--sunday {
  color: #e9b4b4;
}

.journal-calendar__day--outside.journal-calendar__day--saturday {
  color: #abc3e8;
}

.journal-calendar__day--today {
  color: var(--brand-teal-deep, #087f7c);
  background: #e5f7f5;
  box-shadow: inset 0 0 0 1px #b9e6e2;
  font-weight: 800;
}

.journal-calendar__day--selected {
  background: #c8f3ee;
  box-shadow: none;
}

.journal-calendar__markers {
  display: flex;
  min-height: 5px;
  align-items: center;
  gap: 3px;
  margin-top: 5px;
}

.journal-calendar__mark {
  width: 10px;
  height: 2px;
  border-radius: 9999px;
  background: var(--brand-teal-deep, #087f7c);
}

.journal-calendar__activity-mark,
.journal-calendar__legend-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #e58b2d;
}

.journal-calendar__legend {
  display: flex;
  height: 30px;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  padding-right: 6px;
  color: var(--text-tertiary, #94948e);
  font-family: var(--font-sans);
  font-size: var(--font-size-caption);
}

.journal-calendar__legend-mark {
  width: 10px;
  height: 2px;
  border-radius: 9999px;
  background: var(--brand-teal-deep, #087f7c);
}

.journal-calendar__legend-dot {
  margin-left: 5px;
}
</style>
