<script setup>
defineProps({
  label: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <span class="base-badge">{{ label }}</span>
</template>

<style scoped>
.base-badge {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border-radius: 6px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
}
</style>
