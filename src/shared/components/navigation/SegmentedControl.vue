<script setup>
defineProps({
  options: {
    type: Array,
    default: () => ['투자성향', '투자원칙'],
  },
  modelValue: {
    type: String,
    default: '투자성향',
  },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="segmented-control">
    <button
      v-for="option in options"
      :key="option"
      type="button"
      class="segmented-control__item"
      :class="{ 'segmented-control__item--active': modelValue === option }"
      @click="$emit('update:modelValue', option)"
    >
      {{ option }}
    </button>
  </div>
</template>

<style scoped>
.segmented-control {
  display: flex;
  width: 100%;
  height: 48px;
  align-items: center;
  gap: 8px;
  padding: 4px;
  border-radius: 9999px;
  background: transparent;
}

.segmented-control__item {
  display: flex;
  height: 40px;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 9999px;
  background: transparent;
  color: #666662;
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.segmented-control__item--active {
  background: #e8f7f6;
  color: #087f7c;
  font-weight: 700;
}
</style>
