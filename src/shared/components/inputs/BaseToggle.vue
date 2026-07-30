<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    default: true,
  },
  label: {
    type: String,
    default: '알림 받기',
  },
  description: {
    type: String,
    default: '오늘의 일지 마감 전에 알려드려요',
  },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="base-toggle" @click="$emit('update:modelValue', !modelValue)">
    <div class="base-toggle__text-group">
      <span class="base-toggle__label">{{ label }}</span>
      <span v-if="description" class="base-toggle__description">{{ description }}</span>
    </div>

    <button
      type="button"
      role="switch"
      class="base-toggle__switch"
      :class="{ 'base-toggle__switch--on': modelValue }"
      :aria-checked="modelValue"
    >
      <span class="base-toggle__thumb" />
    </button>
  </div>
</template>

<style scoped>
.base-toggle {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  cursor: pointer;
}

.base-toggle__text-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.base-toggle__label {
  color: #181817;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 700;
}

.base-toggle__description {
  color: #94948e;
  font-family: var(--font-sans);
  font-size: 11px;
}

.base-toggle__switch {
  position: relative;
  width: 44px;
  height: 24px;
  border: none;
  border-radius: 9999px;
  background: #dce6e9;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.base-toggle__switch--on {
  background: #087f7c;
}

.base-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}

.base-toggle__switch--on .base-toggle__thumb {
  transform: translateX(20px);
}
</style>
