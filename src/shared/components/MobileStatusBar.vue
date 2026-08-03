<script setup>
defineProps({
  time: {
    type: String,
    default: '9:41',
  },
})
</script>

<template>
  <div class="mobile-status-bar" aria-label="기기 상태">
    <span>{{ time }}</span>
    <span class="mobile-status-bar__icons" aria-hidden="true">
      <span class="signal">▮▮▮▮</span>
      <span>⌁</span>
      <span class="battery" />
    </span>
  </div>
</template>

<style scoped>
.mobile-status-bar {
  display: flex;
  width: 100%;
  height: 62px;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: var(--color-background);
  color: var(--color-heading);
  font-family: var(--font-brand);
  font-size: 12px;
  font-weight: 600;
}

.mobile-status-bar__icons {
  display: flex;
  align-items: center;
  gap: 6px;
}

.signal {
  font-size: 8px;
  letter-spacing: -2px;
}

.battery {
  width: 18px;
  height: 10px;
  border: 1.5px solid currentColor;
  border-radius: 3px;
  box-shadow:
    inset -2px 0 0 1px var(--color-background),
    inset 12px 0 0 currentColor;
}
</style>
