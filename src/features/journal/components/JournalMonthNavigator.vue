<script setup>
import { ref, watch } from 'vue'

import AppIcon from '@/shared/components/AppIcon.vue'

const props = defineProps({
  year: {
    type: Number,
    required: true,
  },
  month: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits(['previous', 'next', 'select'])

const isPickerOpen = ref(false)
const pickerYear = ref(props.year)

watch(
  () => props.year,
  (year) => {
    if (!isPickerOpen.value) {
      pickerYear.value = year
    }
  },
)

function togglePicker() {
  pickerYear.value = props.year
  isPickerOpen.value = !isPickerOpen.value
}

function closePicker() {
  isPickerOpen.value = false
}

function selectMonth(month) {
  emit('select', {
    year: pickerYear.value,
    month,
  })
  closePicker()
}
</script>

<template>
  <div class="month-navigator-wrapper" @keydown.esc="closePicker">
    <div class="month-navigator" aria-label="조회 월 선택">
      <button
        class="month-navigator__button"
        type="button"
        :aria-label="`${month === 1 ? year - 1 : year}년 ${month === 1 ? 12 : month - 1}월 보기`"
        @click="$emit('previous')"
      >
        <AppIcon name="chevron-left" :size="20" />
      </button>

      <button
        class="month-navigator__current"
        type="button"
        aria-haspopup="dialog"
        :aria-expanded="isPickerOpen"
        aria-controls="journal-month-picker"
        @click="togglePicker"
      >
        <span aria-live="polite">{{ year }}년 {{ month }}월</span>
        <AppIcon
          name="chevron-down"
          :size="16"
          class="month-navigator__chevron"
          :class="{ 'month-navigator__chevron--open': isPickerOpen }"
        />
      </button>

      <button
        class="month-navigator__button"
        type="button"
        :aria-label="`${month === 12 ? year + 1 : year}년 ${month === 12 ? 1 : month + 1}월 보기`"
        @click="$emit('next')"
      >
        <AppIcon name="chevron-right" :size="20" />
      </button>
    </div>

    <div
      v-if="isPickerOpen"
      id="journal-month-picker"
      class="month-picker"
      role="dialog"
      aria-modal="false"
      aria-label="월 선택"
    >
      <div class="month-picker__year">
        <button type="button" :aria-label="`${pickerYear - 1}년 보기`" @click="pickerYear -= 1">
          <AppIcon name="chevron-left" :size="18" />
        </button>
        <strong>{{ pickerYear }}년</strong>
        <button type="button" :aria-label="`${pickerYear + 1}년 보기`" @click="pickerYear += 1">
          <AppIcon name="chevron-right" :size="18" />
        </button>
      </div>

      <div class="month-picker__grid">
        <button
          v-for="candidateMonth in 12"
          :key="candidateMonth"
          class="month-picker__month"
          :class="{
            'month-picker__month--selected': pickerYear === year && candidateMonth === month,
          }"
          type="button"
          :aria-pressed="pickerYear === year && candidateMonth === month"
          @click="selectMonth(candidateMonth)"
        >
          {{ candidateMonth }}월
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.month-navigator-wrapper {
  position: relative;
  z-index: 20;
}

.month-navigator {
  display: grid;
  width: 100%;
  height: 48px;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  padding: 0 6px;
  border-radius: 12px;
  color: #ffffff;
  background: var(--teal-deep, #075f5a);
}

.month-navigator__button {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 10px;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.month-navigator__button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.month-navigator__button:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: -3px;
}

.month-navigator__current {
  display: flex;
  height: 44px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  border: 0;
  border-radius: 10px;
  color: inherit;
  background: transparent;
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.month-navigator__current:hover {
  background: rgba(255, 255, 255, 0.1);
}

.month-navigator__current:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: -3px;
}

.month-navigator__chevron {
  transition: transform 0.18s ease;
}

.month-navigator__chevron--open {
  transform: rotate(180deg);
}

.month-picker {
  position: absolute;
  top: 56px;
  left: 0;
  width: 100%;
  padding: 14px;
  border: 1px solid #d9e7e8;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(38, 58, 67, 0.16);
}

.month-picker__year {
  display: grid;
  height: 36px;
  grid-template-columns: 36px 1fr 36px;
  align-items: center;
  margin-bottom: 10px;
}

.month-picker__year strong {
  color: var(--text-primary, #181817);
  font-family: var(--font-heading);
  font-size: 15px;
  text-align: center;
}

.month-picker__year button {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 10px;
  color: var(--slate-primary, #384f59);
  background: transparent;
  cursor: pointer;
}

.month-picker__year button:hover {
  background: var(--slate-soft, #f0f4f5);
}

.month-picker__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.month-picker__month {
  height: 38px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--text-secondary, #666662);
  background: #f7f8fa;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.month-picker__month:hover {
  border-color: #cdecea;
  color: var(--brand-teal-deep, #087f7c);
  background: var(--brand-mist, #f5fbfb);
}

.month-picker__month--selected {
  border-color: #b9e5e2;
  color: var(--brand-teal-deep, #087f7c);
  background: var(--brand-teal-soft, #e8f7f6);
  font-weight: 700;
}

.month-picker__month:focus-visible,
.month-picker__year button:focus-visible {
  outline: 2px solid var(--brand-teal-deep, #087f7c);
  outline-offset: 1px;
}
</style>
