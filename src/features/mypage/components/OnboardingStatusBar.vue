<script setup>
defineProps({
  time: {
    type: String,
    default: '9:41',
  },
})
</script>

<template>
  <div class="status-bar" aria-label="기기 상태">
    <span>{{ time }}</span>
    <span class="status-bar__icons" aria-hidden="true">
      <span class="status-bar__signal">▮▮▮▮</span>
      <span>⌁</span>
      <span class="status-bar__battery" />
    </span>
  </div>
</template>

<style scoped>
.status-bar {
  display: flex;
  width: 100%;
  height: 62px;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: #ffffff;
  color: var(--color-heading);
  font-size: 12px;
  font-weight: 700;
}

.status-bar__icons {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-bar__signal {
  font-size: 8px;
  letter-spacing: -2px;
}

.status-bar__battery {
  width: 18px;
  height: 10px;
  border: 1.5px solid currentcolor;
  border-radius: 3px;
  box-shadow:
    inset -2px 0 0 1px #ffffff,
    inset 12px 0 0 currentcolor;
}
</style>
