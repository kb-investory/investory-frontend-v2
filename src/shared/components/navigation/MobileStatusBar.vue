<script setup>
import { BatteryFull, Signal, Wifi } from '@lucide/vue'

defineProps({
  time: {
    type: String,
    default: '9:41',
  },
  compact: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <div class="mobile-status-bar" :class="{ 'mobile-status-bar--compact': compact }">
    <time class="mobile-status-bar__time">{{ time }}</time>

    <div class="mobile-status-bar__icons" aria-hidden="true">
      <Signal :size="15" :stroke-width="2.2" />
      <Wifi :size="15" :stroke-width="2.2" />
      <BatteryFull :size="20" :stroke-width="2.2" />
    </div>
  </div>
</template>

<style scoped>
.mobile-status-bar {
  display: flex;
  width: 100%;
  height: 62px;
  flex: 0 0 62px;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  color: var(--text-primary, #181817);
  background: var(--surface, #ffffff);
}

.mobile-status-bar__time {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 700;
}

.mobile-status-bar--compact .mobile-status-bar__time {
  font-size: 12px;
}

.mobile-status-bar__icons {
  display: flex;
  align-items: center;
  gap: 5px;
}
</style>
