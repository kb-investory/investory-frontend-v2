<script setup>
import { Check, Flame, Minus, PenLine } from '@lucide/vue'

defineProps({
  weekly: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <section class="weekly-rhythm" aria-labelledby="weekly-rhythm-title">
    <div class="weekly-rhythm__header">
      <div>
        <h2 id="weekly-rhythm-title">이번 주 기록 리듬</h2>
        <p>{{ weekly.description }}</p>
      </div>

      <span class="weekly-rhythm__streak">
        <Flame :size="14" :stroke-width="1.9" />
        {{ weekly.streakDays }}일 연속
      </span>
    </div>

    <div class="weekly-rhythm__days">
      <div
        v-for="day in weekly.days"
        :key="day.date"
        class="weekly-rhythm__day"
        :aria-label="`${day.date}, ${
          day.completed
            ? day.tradeCount > 0
              ? `거래 ${day.tradeCount}건 포함 투자일지 기록`
              : '투자일지 기록'
            : '기록 없음'
        }`"
      >
        <span
          class="weekly-rhythm__day-state"
          :class="[
            `weekly-rhythm__day-state--${day.tone}`,
            { 'weekly-rhythm__day-state--empty': !day.completed },
          ]"
        >
          <Check v-if="day.completed" :size="17" :stroke-width="2.2" />
          <Minus v-else :size="17" :stroke-width="2" />
        </span>
        <span>{{ day.label }}</span>
      </div>
    </div>

    <div class="weekly-rhythm__insight">
      <PenLine :size="16" :stroke-width="1.9" />
      <span>{{ weekly.insight }}</span>
    </div>
  </section>
</template>

<style scoped>
.weekly-rhythm {
  display: flex;
  min-height: 210px;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  padding: 18px 16px;
  border: 1px solid #dce8e9;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(40, 74, 82, 0.08);
}

.weekly-rhythm__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.weekly-rhythm__header h2,
.weekly-rhythm__header p {
  margin: 0;
}

.weekly-rhythm__header h2 {
  color: #181817;
  font-family: var(--font-heading);
  font-size: var(--font-size-title-md);
  font-weight: 700;
}

.weekly-rhythm__header p {
  margin-top: 3px;
  color: #718087;
  font-size: var(--font-size-caption);
}

.weekly-rhythm__streak {
  display: inline-flex;
  min-height: 26px;
  align-items: center;
  gap: 4px;
  padding: 0 9px;
  border-radius: 999px;
  color: #087f7c;
  background: #e8f7f6;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
  white-space: nowrap;
}

.weekly-rhythm__days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}

.weekly-rhythm__day {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 4px;
  color: #718087;
  font-size: var(--font-size-caption);
  font-weight: 600;
}

.weekly-rhythm__day-state {
  display: inline-flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #ffffff;
}

.weekly-rhythm__day-state--teal {
  background: linear-gradient(145deg, #10a39e, #087873);
  box-shadow: 0 5px 12px rgba(11, 143, 139, 0.24);
}

.weekly-rhythm__day-state--blue {
  background: #0b63ce;
}

.weekly-rhythm__day-state--empty {
  border: 1px solid #c9d6da;
  color: #8fa7b0;
  background: #ffffff;
}

.weekly-rhythm__insight {
  display: flex;
  min-height: 40px;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border-radius: 10px;
  color: #087f7c;
  border: 1px solid #e0f1f0;
  background: linear-gradient(90deg, #f1fbfa, #f8fcfc);
  font-size: var(--font-size-caption);
  font-weight: 600;
}

.weekly-rhythm__insight svg {
  flex: 0 0 auto;
}
</style>
