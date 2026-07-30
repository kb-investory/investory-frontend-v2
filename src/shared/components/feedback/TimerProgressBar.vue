<script setup>
defineProps({
  label: {
    type: String,
    default: '오늘 일지 마감까지',
  },
  timerText: {
    type: String,
    default: '03:42:18',
  },
  percentage: {
    type: Number,
    default: 45,
  },
})
</script>

<template>
  <div class="timer-progress-bar">
    <div class="timer-progress-bar__header">
      <span class="timer-progress-bar__label">{{ label }}</span>
      <span class="timer-progress-bar__timer">{{ timerText }}</span>
    </div>

    <div class="timer-progress-bar__track">
      <div
        class="timer-progress-bar__fill"
        :style="{ width: `${percentage}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
.timer-progress-bar {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 6px;
}

.timer-progress-bar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.timer-progress-bar__label {
  color: #181817;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 700;
}

.timer-progress-bar__timer {
  color: #087f7c;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
}

.timer-progress-bar__track {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e9eeef;
  overflow: hidden;
}

.timer-progress-bar__fill {
  height: 100%;
  border-radius: 3px;
  background: #087f7c;
  transition: width 0.3s ease;
}
</style>
