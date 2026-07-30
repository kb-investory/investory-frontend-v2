<script setup>
defineProps({
  statusText: {
    type: String,
    default: '기록 완료',
  },
  stepText: {
    type: String,
    default: '2 / 6',
  },
})
</script>

<template>
  <div class="status-badge-row">
    <div class="status-badge-row__pill">
      <span class="status-badge-row__dot" />
      <span class="status-badge-row__text">{{ statusText }}</span>
    </div>
    <span class="status-badge-row__step">{{ stepText }}</span>
  </div>
</template>

<style scoped>
.status-badge-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge-row__pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  background: #e8f7f6;
}

.status-badge-row__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #087f7c;
}

.status-badge-row__text {
  color: #087f7c;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 700;
}

.status-badge-row__step {
  color: #666662;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
}
</style>
