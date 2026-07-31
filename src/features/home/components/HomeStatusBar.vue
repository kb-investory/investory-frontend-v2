<script setup>
import { BatteryFull, Signal, Wifi } from '@lucide/vue'

defineProps({
  time: {
    type: String,
    default: '9:41',
  },
})
</script>

<template>
  <div class="home-status-bar" aria-label="기기 상태">
    <time class="home-status-bar__time">{{ time }}</time>

    <div class="home-status-bar__icons" aria-hidden="true">
      <Signal :size="16" :stroke-width="2.2" />
      <Wifi :size="16" :stroke-width="2.2" />
      <BatteryFull :size="20" :stroke-width="2.2" />
    </div>
  </div>
</template>

<style scoped>
.home-status-bar {
  display: flex;
  width: 100%;
  height: 62px;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  color: #181817;
  background: #ffffff;
}

.home-status-bar__time {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 700;
}

.home-status-bar__icons {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
